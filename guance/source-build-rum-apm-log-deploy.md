# OpenTelemetry Demo 源码编译、镜像构建与观测云接入实战

## 1. 目标

本文档用于指导以下完整交付链路：

- 基于 OpenTelemetry Demo 源码进行改造
- 在前端接入观测云 RUM
- 构建自定义前端镜像
- 部署到 Kubernetes
- 验证 RUM、APM、日志三条链路在观测云中贯通

## 2. 改造范围

本次改造重点聚焦 `frontend` 组件。

核心目标：

- 保留原有 OpenTelemetry Web Trace
- 增加 Guance Browser RUM
- 让前端页面访问、前端 Trace、后端微服务 Trace 能串联起来

## 3. 关键改造文件

- `src/frontend/pages/_app.tsx`
- `src/frontend/pages/_document.tsx`
- `src/frontend/utils/rum/GuanceRum.ts`
- `src/frontend/Dockerfile`

## 4. 前端 RUM 接入说明

本次采用的是 **CDN 异步加载方式**，原因是：

- 不额外增加 npm 依赖
- 构建链路更轻
- 更适合先快速完成方案验证

RUM 初始化参数包括：

- `applicationId=OpenTelemetry_Demo`
- `site=https://rum-openway.guance.com`
- `clientToken=<Guance RUM Token>`
- `service=OpenTelemetry_Demo`
- `env=prod`
- `traceType=w3c_traceparent`

其中 `traceType=w3c_traceparent` 的作用是：

- 与现有 OpenTelemetry Web Trace 传播方式保持一致
- 更容易完成前端 RUM 与后端 APM 的链路关联

## 5. 镜像构建注意事项

由于国内网络环境可能导致 Docker Hub / npm 官方源拉取不稳定，本次对 `frontend/Dockerfile` 做了以下兼容：

- Node 基础镜像改为国内可访问镜像源
- npm registry 改为 `https://registry.npmmirror.com`
- 构建阶段和运行阶段都使用 `node:24-slim`

这样做的目的不是最小镜像，而是优先保证：

- 能稳定构建
- 能快速交付
- 能在受限网络环境中复现

## 6. 本地编译验证

进入前端目录后可执行：

```bash
cd src/frontend
npm ci
npm run build
```

成功标准：

- TypeScript 编译通过
- Next.js 构建通过

## 7. 镜像构建示例

在仓库根目录执行：

```bash
podman build -f src/frontend/Dockerfile -t <your-registry>/otel-demo-frontend-rum:<tag> .
podman push <your-registry>/otel-demo-frontend-rum:<tag>
```

如果使用 Docker，同样可以替换为：

```bash
docker build -f src/frontend/Dockerfile -t <your-registry>/otel-demo-frontend-rum:<tag> .
docker push <your-registry>/otel-demo-frontend-rum:<tag>
```

## 8. Kubernetes 更新方式

本次实践为了避免影响共享集群其他组件，仅更新 `frontend` Deployment：

```bash
kubectl -n otel-demo-yww-20260325 set image deploy/frontend \
  frontend=<your-registry>/otel-demo-frontend-rum:<tag>
```

同时为 Deployment 注入 RUM 相关环境变量，例如：

```bash
kubectl -n otel-demo-yww-20260325 set env deploy/frontend \
  GUANCE_RUM_ENABLED=true \
  GUANCE_RUM_APPLICATION_ID=OpenTelemetry_Demo \
  GUANCE_RUM_SITE=https://rum-openway.guance.com \
  GUANCE_RUM_CLIENT_TOKEN=<your-rum-token> \
  GUANCE_RUM_ENV=prod \
  GUANCE_RUM_VERSION=1.0.0 \
  GUANCE_RUM_SERVICE=OpenTelemetry_Demo \
  GUANCE_RUM_SESSION_SAMPLE_RATE=100 \
  GUANCE_RUM_SESSION_REPLAY_SAMPLE_RATE=100 \
  GUANCE_RUM_COMPRESS_INTAKE_REQUESTS=true \
  GUANCE_RUM_TRACK_INTERACTIONS=true \
  GUANCE_RUM_TRACE_TYPE=w3c_traceparent
```

## 9. 验证方法

### 9.1 页面验证

确认页面可访问：

```bash
curl -I http://<NodeIP>:32081
```

### 9.2 浏览器网络验证

打开页面后，浏览器 Network 中应看到：

- `POST /otlp-http/v1/traces`
- `POST https://rum-openway.guance.com/v1/write/rum`

如果两类请求都返回 `200`，说明：

- 前端 APM 正常
- 前端 RUM 正常

### 9.3 观测云验证

建议按以下顺序检查：

1. RUM 中查看页面访问
2. APM 中查看 `frontend-web`、`frontend`、`checkout` 等服务
3. 日志中查看带 `trace_id`、`span_id` 的应用日志

## 10. 如何找一条完整链路

建议使用人工制造流量的方法：

1. 打开无痕窗口
2. 访问首页
3. 进入商品详情页
4. 加入购物车
5. 进入购物车并结账

然后在观测云中查看：

- RUM 会话
- `frontend-web` Trace
- `frontend` 服务 Trace
- `checkout/payment/shipping/cart` 服务 Trace

这样最容易找到一条完整的前后端链路。

## 11. 交付建议

如果要把本方案作为观测云标准交付样板，建议保留以下内容：

- 源码改造说明
- 镜像构建方法
- K8s 更新步骤
- RUM/APM/日志验证清单
- 常见问题说明

这样既适合内部方案演示，也适合客户 POC 复用。
