# Token统计功能测试脚本

## 概述

本目录包含了ScholarAgent项目中Token统计功能的完整测试套件。测试脚本可以验证Token记录、统计和显示功能是否正常工作。

## 文件说明

### 1. 测试脚本

- `apps/billing/management/commands/test_token_stats.py` - Django管理命令，用于测试Token统计功能
- `test_token_stats.py` - 独立测试脚本（备用）

### 2. 测试报告

- `token_stats_report_YYYYMMDD_HHMMSS.json` - 测试结果报告

## 使用方法

### 方法1：使用Django管理命令（推荐）

```bash
cd backend
python manage.py test_token_stats
```

### 方法2：使用独立脚本（需要Django服务器运行）

```bash
cd backend
python test_token_stats.py
```

## 测试内容

测试脚本会验证以下功能：

1. **用户管理**：创建测试用户
2. **Token记录**：测试不同类型的Token使用记录
3. **统计功能**：验证用户和系统统计
4. **API端点**：测试所有Token统计API
5. **错误处理**：验证错误情况的处理
6. **报告生成**：生成详细的测试报告

## 测试报告

测试完成后会生成一个JSON格式的报告文件，包含：

- 测试时间
- 数据库统计信息
- 测试用户信息
- Token使用统计
- API测试结果

## 示例输出

```
🚀 开始Token统计功能测试...
==================================================
🔧 创建测试用户...
✅ 创建了新测试用户: token_test_user

🧹 清理测试数据...
  🗑️ 删除了 0 条Token记录
  🗑️ 删除了 0 条用户统计

📊 测试Token记录功能...
  ✅ 创建记录 1: ai_chat - 150 tokens
  ✅ 创建记录 2: agent_execution - 300 tokens
  ✅ 创建记录 3: document_index - 225 tokens
  ✅ 创建记录 4: other - 120 tokens
✅ Token记录功能测试完成

🔍 测试统计功能...
  📈 用户统计:
    - 总输入Token: 530
    - 总输出Token: 265
    - 总Token数: 795
    - API调用次数: 4
  📋 用户记录数量: 4
  🌐 系统统计:
    - 今日日期: 2025-12-11
    - 今日Token数: 1670
✅ 统计功能测试完成

📄 生成测试报告...
  ✅ 测试报告已保存到: token_stats_report_20251212_051326.json
  📊 测试用户总Token数: 795
  📝 测试用户记录数: 4
==================================================
🎉 Token统计功能测试完成！
```

## 故障排除

### 1. Django设置问题

如果遇到Django设置相关错误，确保：

- 在backend目录中运行命令
- Django环境变量正确设置
- 数据库连接正常

### 2. API测试失败

如果API测试失败，检查：

- Django服务器是否运行：`python manage.py runserver`
- 服务器端口是否正确（默认8000）
- 网络连接是否正常

### 3. 权限问题

如果遇到权限问题，确保：

- 数据库用户有足够权限
- 文件系统有写入权限（用于生成报告）

## 集成到CI/CD

可以将测试脚本集成到CI/CD流程中：

```yaml
- name: Test Token Statistics
  run: |
    cd backend
    python manage.py test_token_stats
```

## 相关文件

- `apps/billing/models.py` - Token统计数据模型
- `apps/billing/services.py` - Token统计业务逻辑
- `apps/billing/views.py` - Token统计API视图
- `frontend/src/services/billingService.ts` - 前端Token统计服务
- `frontend/src/components/common/TokenUsageCard.tsx` - Token使用卡片组件
- `frontend/src/components/settings/TokenUsageStats.tsx` - Token统计页面组件

## 联系方式

如有问题或建议，请联系开发团队。