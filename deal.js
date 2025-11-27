function parseImageView2(imageView2) {
  const parts = imageView2.split('/');
  if (parts.length < 1) return null;
  let i = 0;
  let mode, width, height, format, interlace, quality;
  if (parts[i]) {
    mode = parseInt(parts[i], 10);
    i++;
  }
  while (i < parts.length) {
    const key = parts[i];
    const val = parts[i + 1];
    if (!val) break;
    switch (key) {
      case 'w':
        width = parseInt(val, 10);
        break;
      case 'h':
        height = parseInt(val, 10);
        break;
      case 'format':
        format = val;
        break;
      case 'interlace':
        interlace = parseInt(val, 10);
        break;
      case 'q':
        quality = parseInt(val, 10);
        break;
    }
    i += 2;
  }
  return { mode, width, height, format, interlace, quality };
}

export default {
  async fetch(request, env) {
    try {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const searchParams = url.searchParams;

    // 检查是否有 imageView2 参数（如 ?imageView2/2/w/20/h/20/format/jpg/q/90）
    let imageView2Key = null;
    for (const [key] of searchParams) {
      if (key.startsWith('imageView2')) {
        imageView2Key = key;
        break;
      }
    }

    if (imageView2Key) {
      // 取出参数链（去掉 imageView2/ 前缀）
      let imageView2 = imageView2Key;
      if (searchParams.get(imageView2Key)) {
        imageView2 += '/' + searchParams.get(imageView2Key);
      }
      imageView2 = imageView2.replace(/^imageView2\//, '');

      const params = parseImageView2(imageView2);
      if (!params) {
        return new Response('Invalid imageView2 parameters', { status: 400 });
      }

      // 从 R2 获取原图
      const object = await env.MY_BUCKET.get(pathname.slice(1));
      if (!object) {
        return new Response('Image not found', { status: 404 });
      }
      const imageData = await object.arrayBuffer();

      // 构造 Image Resizing 选项
      const options = {};
      if (params.width) options.width = params.width;
      if (params.height) options.height = params.height;
      if (params.quality) options.quality = params.quality;
      if (params.format) options.format = params.format;
      // 你可以根据 params.mode 决定 fit 策略
      // 例如 mode=1/3/5 用 cover，mode=0/2/4 用 contain
      if (params.mode === 1 || params.mode === 3 || params.mode === 5) {
        options.fit = 'cover';
      } else {
        options.fit = 'contain';
      }

      // 调用 Image Resizing API
      const transformedImage = await env.IMAGES.transform(imageData, options);

      return new Response(transformedImage, {
        headers: {
          'Content-Type': params.format ? `image/${params.format}` : 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000',
        },
      });
    } else {
      // 没有 imageView2 参数，直接返回原图
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
} catch (e) {
      console.error('Worker error:', e);
      return new Response('Internal Error', { status: 500 });
    }
  }
}
