# OpenTelemetry Demo 接入观测云最佳实践

## 1. 方案目标

本文档用于指导在 Kubernetes 环境中部署 OpenTelemetry 官方 Demo，并将链路、指标、日志统一接入观测云。

目标包括：

- 保留 OpenTelemetry Demo 的完整多语言业务形态
- 不依赖 Jaeger、Prometheus、Grafana、OpenSearch 等内置存储和可视化组件
- 通过 `otel-collector -> DataKit -> 观测云` 完成统一上报
- 在共享集群中以独立 `namespace` 隔离部署，避免影响现有业务

---

## 2. 适用场景

适用于以下场景：

- 方案演示
- 客户 POC
- 多语言可观测性验证
- 观测云集成方案样板
- OTel 数据接入链路验证

尤其适合：

- 需要一套“开箱即用”的多语言演示系统
- 需要验证 Browser Trace、Service Trace、Metrics、Logs 的统一采集
- 集群是共享集群，不能随意改动已有 DataKit 或其他公共组件

---

## 3. 为什么选择 OpenTelemetry Demo

OpenTelemetry 官方 Demo 不是单个服务，而是一整套电商演示系统，包含多语言、多运行时、多协议组件。  
它的价值不在业务本身，而在于它天然适合作为观测平台集成验证样板。

它覆盖了：

- 前端 Web
- 前端代理
- Go / Java / .NET / Python / Node.js / C++ 等多语言服务
- Kafka、PostgreSQL、Valkey 等基础依赖
- Feature Flag 场景
- Load Generator 压测流量

因此，这套 Demo 非常适合用来展示观测云对 OpenTelemetry 生态的兼容能力。

---

## 4. 推荐架构

推荐使用如下链路：

```text
Browser / Demo Services
        |
        v
OpenTelemetry Collector
        |
        v
DataKit (OTLP Gateway)
        |
        v
Guance DataWay
        |
        v
观测云
```

设计原则：

- 应用只对接 `otel-collector`
- `otel-collector` 负责统一接收和资源标签补充
- `DataKit` 负责对接观测云 DataWay
- 所有业务组件部署在独立 namespace 中
- 不改动共享集群已有 DataKit

---

## 5. 共享集群最佳实践

如果目标环境是多人共用的 Kubernetes 集群，建议遵循以下原则：

- 使用独立 `namespace`
- 不修改已有公共 `DataKit`
- 不创建额外的集群级侵入资源
- 避免直接抢占根路径 `/` 的 Ingress
- 优先采用独立 `NodePort` 或独立域名/路径
- 所有上报链路在本 namespace 内闭环

本次落地采用的 namespace：

- `otel-demo-yww-20260325`

---

## 6. 观测云集成设计

### 6.1 DataKit 角色

DataKit 作为 OTLP 网关，主要职责是：

- 暴露 OTLP gRPC `4317`
- 暴露 OTLP HTTP `4318`
- 接收来自 `otel-collector` 的 traces / metrics / logs
- 将数据转发到观测云 DataWay

### 6.2 资源标签建议

建议统一补充以下标签：

- `project=otel-demo`
- `env=guance-shared-k8s`
- `cluster_name_k8s=otel-demo-ack-shared`
- `k8s.cluster.name=otel-demo-ack-shared`
- `k8s.namespace.name=otel-demo-yww-20260325`

这样在观测云中便于：

- 识别该 Demo 数据
- 与其他集群数据隔离
- 按项目和环境筛选

---

## 7. 实施文件

本次实践中沉淀了两份核心文件：

- [otel-demo/values-shared-cluster.yaml](/Users/yangwenwei/Desktop/codex-project/my-app/test/otel-demo/values-shared-cluster.yaml)
- [otel-demo/datakit-gateway.yaml](/Users/yangwenwei/Desktop/codex-project/my-app/test/otel-demo/datakit-gateway.yaml)

说明如下。

### 7.1 `datakit-gateway.yaml`

用途：

- 创建独立 namespace
- 部署单实例 DataKit
- 暴露 OTLP 入口
- 配置 DataWay

关键点：

- `ENV_DEFAULT_ENABLED_INPUTS=opentelemetry`
- `ENV_DATAWAY` 指向观测云上报地址
- 开启 `4317/4318`
- 使用轻量部署，不使用 DaemonSet

### 7.2 `values-shared-cluster.yaml`

用途：

- 定义 OpenTelemetry Demo 的共享集群部署策略
- 禁用不需要的内置后端
- 配置 `otel-collector` 出口到本 namespace 的 DataKit
- 统一镜像源与访问入口

关键点：

- 业务镜像使用 `docker.m.daocloud.io/otel/demo`
- `postgres`、`valkey`、`busybox` 使用国内可拉取镜像源
- `frontend-proxy` 暴露为 `NodePort`
- `frontend` 使用 `envOverrides` 保留默认环境变量
- `otel-collector` 改为 `deployment`
- `otel-collector` 仅转发到 `otel-demo-datakit:4317`
- 禁用：
  - `jaeger`
  - `prometheus`
  - `grafana`
  - `opensearch`

---

## 8. 部署步骤

### 8.1 部署独立 DataKit

```bash
kubectl apply -f otel-demo/datakit-gateway.yaml
```

### 8.2 添加 Helm 仓库

```bash
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
helm repo update
```

### 8.3 安装或升级 Demo

```bash
helm upgrade --install otel-demo open-telemetry/opentelemetry-demo \
  --namespace otel-demo-yww-20260325 \
  -f otel-demo/values-shared-cluster.yaml \
  --wait --timeout 10m
```

---

## 9. 访问入口

本次实践中，`frontend-proxy` 暴露方式为 `NodePort`：

- `32081`

访问方式：

- 集群外部访问：`http://<NodeIP>:32081`
- 本地临时验证：

```bash
kubectl -n otel-demo-yww-20260325 port-forward svc/frontend-proxy 8080:8080
```

可访问页面：

- `/`
- `/loadgen/`
- `/feature/`

---

## 10. 验证清单

### 10.1 Kubernetes 侧验证

确认所有 Deployment 就绪：

```bash
kubectl -n otel-demo-yww-20260325 get deploy
kubectl -n otel-demo-yww-20260325 get pods
```

确认关键服务存在：

```bash
kubectl -n otel-demo-yww-20260325 get svc
```

重点检查：

- `frontend-proxy`
- `frontend`
- `otel-collector`
- `otel-demo-datakit`
- `load-generator`
- `flagd`

### 10.2 页面验证

验证首页是否返回 `200`：

```bash
curl -I http://127.0.0.1:8080/
```

验证子路径：

```bash
curl -I http://127.0.0.1:8080/loadgen/
curl -I http://127.0.0.1:8080/feature/
```

### 10.3 观测云验证

在观测云中建议按以下条件筛选：

- `project = otel-demo`
- `env = guance-shared-k8s`
- `cluster_name_k8s = otel-demo-ack-shared`
- `k8s.namespace.name = otel-demo-yww-20260325`

建议验证以下数据类型：

- 应用链路
- 主机/容器指标
- 应用日志
- 前端访问链路

---

## 11. 常见问题与处理经验

### 11.1 共享集群 Pod 位不足

现象：

- Pod `Pending`
- 事件中出现 `Too many pods`

建议：

- 先统计各节点 `allocatablePods`
- 优先扩节点，而不是盲目重复重试
- 升级过程中旧 ReplicaSet 会短时占位，要预留缓冲

### 11.2 Docker Hub 拉取超时

现象：

- `ErrImagePull`
- `ImagePullBackOff`
- `dial tcp ... i/o timeout`

建议：

- 将业务镜像改为 `docker.m.daocloud.io/otel/demo`
- 将 `postgres`、`valkey`、`busybox` 切换到国内可拉取代理源
- 对 collector 使用已验证可拉取的官方镜像仓库

### 11.3 `frontend` 首页 503

现象：

- `frontend-proxy` 正常
- `/loadgen/`、`/feature/` 正常
- `/` 返回 `503`

原因：

- 覆盖了 `frontend` 默认环境变量，导致前端监听端口和 Service 转发不一致

建议：

- 使用 `envOverrides`
- 不要用 `env` 整块覆盖默认变量

### 11.4 `flagd` Init 容器循环失败

现象：

- `Init:CrashLoopBackOff`

原因：

- 自定义 `initContainers` 时丢失了原有 `volumeMounts`

建议：

- 修改 init 容器镜像时保留原有挂载

### 11.5 NodePort 外网不通

现象：

- 集群内正常
- 集群外访问超时

建议：

- 检查安全组
- 检查 SLB / ACL
- 检查节点公网暴露策略

---

## 12. 推荐交付口径

面向客户或内部演示时，建议这样描述这套方案：

> 基于 OpenTelemetry 官方多语言 Demo，在 Kubernetes 中构建完整业务场景，通过 OpenTelemetry Collector 聚合数据、通过 DataKit 与观测云打通，最终实现链路、指标、日志、前端访问的统一可观测验证。

这个口径的价值在于：

- 有真实多语言业务链路
- 有标准 OTel 接入方式
- 有观测云统一汇聚能力
- 能作为后续客户集成模板

---

## 13. 后续可扩展项

后续可继续增强：

- 增加 Ingress 访问方案
- 增加 Browser RUM 验证截图
- 增加观测云控制台验证截图
- 增加故障注入演示步骤
- 增加最佳实践文章版排版

---

## 14. 总结

这套方案的核心不是“把官方 Demo 跑起来”，而是沉淀一套适合观测云交付的标准集成方式：

- 以 OTel 官方 Demo 作为业务样板
- 以 `otel-collector` 作为统一接入层
- 以 `DataKit` 作为观测云接入层
- 以独立 namespace 适配共享集群
- 以统一标签实现观测云中的清晰识别和归类

这套方式可以直接复用于：

- 客户演示环境
- 销售 PoC
- 解决方案验证
- 培训实验环境
