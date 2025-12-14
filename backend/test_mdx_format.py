#!/usr/bin/env python
import os
import sys

# 检查 MDX 文件格式
mdx_path = "/Users/renqing/Downloads/scholaragent/简明英汉字典增强版.mdx"

print(f"检查 MDX 文件: {mdx_path}")
print(f"文件大小: {os.path.getsize(mdx_path) / 1024 / 1024:.2f} MB")

# 读取文件开头
with open(mdx_path, 'rb') as f:
    header = f.read(100)

print("\n文件开头字节（十六进制）:")
print(' '.join(f'{b:02x}' for b in header[:32]))
print("\n文件开头字节（ASCII）:")
print(''.join(chr(b) if 32 <= b <= 126 else '.' for b in header[:32]))

# 检查是否为标准 MDX 格式
if header.startswith(b'\xcd\x76\x32\x31'):
    print("\n✓ 检测到标准 MDX 格式")
elif b'\x00' in header[:100]:
    print("\n⚠ 可能包含 Unicode 字符")

    # 尝试解码
    try:
        text = header.decode('utf-16-le', errors='ignore')
        if 'Dictionary' in text or 'Generated' in text:
            print("✓ 检测到 Unicode MDX 格式")
        print(f"Unicode 解码结果（前100字符）: {text[:100]}")
    except:
        print("✗ 无法解码为 Unicode")
else:
    print("\n✗ 未知格式")

    # 尝试以文本方式读取
    try:
        with open(mdx_path, 'r', encoding='utf-8', errors='ignore') as f:
            text = f.read(1000)
        print(f"\n文本模式读取（前200字符）: {text[:200]}")
    except:
        print("✗ 无法以文本模式读取")

# 检查文件中是否有明显的文本内容
print("\n搜索文件中的常见词汇...")
common_words = [b'hello', b'world', b'apple', b'dictionary', b'\x68\x65\x6c\x6c\x6f']  # 'hello' 的 UTF-8 编码
with open(mdx_path, 'rb') as f:
    content = f.read(10000)  # 读取前10KB

for word in common_words:
    if word in content:
        print(f"  找到: {word.decode('utf-8', errors='ignore') if isinstance(word, bytes) else word}")