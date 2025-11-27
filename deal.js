export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname; // 获取请求路径
    const searchParams = url.searchParams;

    // 检查是否有图片处理参数
    const imageView2 = searchParams.get('imageView2');
    if (imageView2) {
      // 解析 imageView2 参数
      const params = parseImageView2(imageView2);
      if (!params) {
        return new Response('Invalid imageView2 parameters', { status: 400 });
      }

      // 从 R2 获取原始图片
      const object = await env.MY_BUCKET.get(pathname.slice(1)); // 去掉开头的 '/'
      if (!object) {
        return new Response('Image not found', { status: 404 });
      }

      // 读取图片数据
      const imageData = await object.arrayBuffer();

      // 调用 Image Resizing API 处理图片
      const transformedImage = await env.IMAGES.transform(imageData, {
        fit: 'cover',
        width: params.width,
        height: params.height,
      });

      // 返回处理后的图片
      return new Response(transformedImage, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000',
        },
      });
    } else {
      // 没有图片处理参数，直接从 R2 获取原图
      const object = await env.MY_BUCKET.get(pathname.slice(1));
      if (!object) {
        return new Response('Image not found', { status: 404 });
      }

      return new Response(object.body, {
        headers: {
          'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000',
        },
      });
    }
  },
};

// 解析 imageView2 参数的函数
function parseImageView2(imageView2) {
  const parts = imageView2.split('/');
  if (parts.length < 4 || parts[0] !== '2') {
    return null;
  }
  const mode = parts[1];
  const param = parts[2];
  const value = parseInt(parts[3], 10);
  if (isNaN(value)) {
    return null;
  }
  if (param === 'h') {
    return { width: undefined, height: value };
  } else if (param === 'w') {
    return { width: value, height: undefined };
  } else {
    return null;
  }
}
