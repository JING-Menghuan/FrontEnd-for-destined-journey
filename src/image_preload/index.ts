export {};

interface Prefetch {
  title: string;
  assets: string[];
}

const Settings = z.object({
  资源预载: z.string().default(''),
});

const variable_option = { type: 'script', script_id: getScriptId() } as const;

function get_prefetches(): Prefetch[] {
  const settings = Settings.parse(getVariables(variable_option));
  insertVariables(settings, variable_option);

  return _(getTavernRegexes())
    .filter(regex => regex.enabled && regex.script_name.includes('预载-'))
    .map(regex => ({
      title: regex.script_name.replace('预载-', '').replaceAll(/【.+?】/gs, ''),
      content: regex.replace_string,
    }))
    .concat([{ title: '脚本变量', content: settings.资源预载 }])
    .map(({ title, content }) => ({
      title,
      assets: content
        .split('\n')
        .map(asset => asset.trim())
        .filter(asset => !!asset),
    }))
    .value();
}

const CACHE_NAME = 'destined-journey-cache-v1';

const cacheAsset = async (asset: string): Promise<void> => {
  if (!('caches' in window)) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(asset);
    if (cached) return;
    const response = await fetch(asset, { mode: 'cors' });
    if (response.ok) {
      await cache.put(asset, response.clone());
    }
  } catch (error) {
    console.warn('[ImagePreload] 缓存资源失败:', asset, error);
  }
};

const preloadImage = (asset: string): Promise<void> => {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = asset;
  });
};

$(() => {
  Promise.allSettled(
    get_prefetches().flatMap(prefetch =>
      prefetch.assets.flatMap(asset => [preloadImage(asset), cacheAsset(asset)]),
    ),
  );
});
