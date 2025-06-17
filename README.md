# 编译镜像

```shell
docker build -t ericwang2006/baidu-oauth-worker .
```

# 运行镜像

```shell
# 使用ES文件管理器的授权密钥
docker run -d \
  --name baidu-oauth-worker \
  -p 8787:8787 \
  -e API_KEY="NqOMXF6XGhGRIGemsQ9nG0Na" \
  -e SECRET_KEY="SVT6xpMdLcx6v4aCR4wT8BBOTbzFO8LM" \
  --restart=always \
  ericwang2006/baidu-oauth-worker
```