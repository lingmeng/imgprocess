export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname; // 获取路径
    const searchParams = url.searchParams; // 获取查询参数

    // 解析图片处理参数，例如：?imageView2/2/h/200
    const imageView2 = searchParams.get('imageView2');
    if (!imageView2) {
      // 如果没有处理参数，直接从 R2 获取原图
      return fetchFromR2(pathname, env);
    }

    // 解析 imageView2 参数
    const params = parseImageView2(imageView2);
    if (!params) {
      return new Response('Invalid imageView2 parameters', { status: 400 });
    }

    // 从 R2 获取原始图片
    const originalImage = await fetchFromR2(pathname, env);
    if (!originalImage.ok) {
      return new Response('Original image not found', { status: 404 });
    }

    // 调用 Cloudflare Images API 处理图片
    const processedImage = await processImageWithCloudflareImages(originalImage, params, env);
    if (!processedImage.ok) {
      return new Response('Image processing failed', { status: 500 });
    }

    // 返回处理后的图片
    return new Response(processedImage.body, {
      headers: {
        'Content-Type': processedImage.headers.get('Content-Type'),
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  },
};

// 从 R2 获取原始图片的函数
async function fetchFromR2(pathname, env) {
  const object = await env.MY_BUCKET.get(pathname);
  if (!object) {
    return new Response('Not found', { status: 404 });
  }
  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata.contentType,
    },
  });
}

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
  return { mode, param, value };
}

// 调用 Cloudflare Images API 处理图片的函数
async function processImageWithCloudflareImages(image, params, env) {
  const { mode, param, value } = params;
  let resizeOptions = {};

  if (mode === '2') {
    if (param === 'h') {
      resizeOptions.height = value;
    } else if (param === 'w') {
      resizeOptions.width = value;
    } else {
      return new Response('Unsupported parameter', { status: 400 });
    }
  } else {
    return new Response('Unsupported mode', { status: 400 });
  }

  const formData = new FormData();
  formData.append('file', image.body, 'image.jpg');
  formData.append('resize', JSON.stringify(resizeOptions));

  const response = await fetch('https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT_ID/images/v1', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.CLOUDFLARE_IMAGES_API_TOKEN}`,
    },
    body: formData,
  });

  return response;
}
