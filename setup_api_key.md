# 配置DeepSeek API Key

## 方法1：设置环境变量（推荐）

在终端中运行以下命令：

```bash
# 临时设置（当前会话有效）
export DEEPSEEK_API_KEY="your_api_key_here"

# 或者永久设置到shell配置文件中
echo 'export DEEPSEEK_API_KEY="your_api_key_here"' >> ~/.zshrc
source ~/.zshrc
```

## 方法2：创建.env文件

在backend目录下创建`.env`文件：

```bash
cd /Users/renqing/Downloads/scholaragent/backend
echo 'DEEPSEEK_API_KEY=your_api_key_here' > .env
```

## 方法3：直接在Django settings中配置

编辑 `backend/config/settings.py`，添加：

```python
DEEPSEEK_API_KEY = 'your_api_key_here'
```

## 获取API Key

1. 访问 [DeepSeek官网](https://platform.deepseek.com/)
2. 注册并登录
3. 前往API Keys页面
4. 创建新的API key
5. 复制API key并替换上面的 `your_api_key_here`

## 验证配置

配置完成后，重启Django服务器：

```bash
cd /Users/renqing/Downloads/scholaragent/backend
python manage.py runserver
```

然后测试AI助手功能，token统计应该会正常更新。