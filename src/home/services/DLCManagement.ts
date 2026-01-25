import { getFilteredEntries, getWorldBookName, updateWorldBook } from './worldbookload&update';

// ========================
// 角色相关类型和常量
// ========================

// 角色选项类型
export interface CharacterOption {
  value: string; // 完整条目名称，如 "[角色]name(A-原创角色)"
  label: string; // 显示名称，如 "name"
  author: string; // 作者，如 "A"
  info: string; // 其他信息，如 "原创角色"
  enabled: boolean;
}

// 角色条目匹配模式 - 匹配以"[角色]"开头的条目
const CHARACTER_PATTERN = /^\[角色\]/;

// 解析角色名和作者的正则 - 匹配 "角色名(作者)" 格式
const CHARACTER_NAME_PATTERN = /^(.+?)(?:\(([^)]+)\))?$/;

/**
 * 角色状态初始值
 */
export const initialCharacterState = {
  characterOptions: [] as CharacterOption[],
  localCharacterSelections: new Map<string, boolean>(),
};

// ========================
// 事件相关类型和常量
// ========================

// 事件条目类型（单个世界书条目）
export interface EventEntry {
  name: string; // 完整条目名称，如 "[事件][双子]双子星的咏叹调-本体"
  enabled: boolean;
}

// 事件选项类型（分组后的事件）
export interface EventOption {
  eventKey: string; // 事件唯一标识，如 "[事件][双子]"
  label: string; // 显示名称，如 "双子"
  author: string; // 作者（从条目中提取）
  info: string; // 其他信息（从条目中提取）
  entries: EventEntry[]; // 该事件下的所有条目
  enabled: boolean; // 事件是否启用（所有条目启用时为true）
}

// 事件条目匹配模式 - 匹配以"[事件]"开头的条目
const EVENT_PATTERN = /^\[事件\]/;

// 提取事件名的正则 - 匹配 "[事件][事件名]" 格式
const EVENT_KEY_PATTERN = /^(\[事件\]\[[^\]]+\])/;

// 提取事件显示名称的正则 - 匹配 "[事件名]" 中的事件名
const EVENT_LABEL_PATTERN = /^\[事件\]\[([^\]]+)\]/;

// 提取作者的正则 - 匹配最后一个 "(作者)" 格式（事件和扩展通用）
const AUTHOR_PATTERN = /\(([^)]+)\)(?=[^()]*$)/;

/**
 * 事件状态初始值
 */
export const initialEventState = {
  eventOptions: [] as EventOption[],
  localEventSelections: new Map<string, boolean>(),
};

// ========================
// 扩展相关类型和常量
// ========================

// 扩展条目类型（单个世界书条目）
export interface ExtensionEntry {
  name: string; // 完整条目名称，如 "[扩展][无尽深渊地城扩展][!原版无尽深渊地城]无尽深渊地城-控制(Hilo)"
  enabled: boolean;
}

// 扩展选项类型（分组后的扩展）
export interface ExtensionOption {
  extensionKey: string; // 扩展唯一标识，如 "[扩展][无尽深渊地城扩展][!原版无尽深渊地城]"
  label: string; // 显示名称，如 "无尽深渊地城扩展"
  author: string; // 作者，如 "Hilo"
  info: string; // 其他信息
  exclusionTarget: string | null; // 互斥目标，如 "原版无尽深渊地城"（从 [!xxx] 中提取）
  entries: ExtensionEntry[]; // 该扩展下的所有条目
  enabled: boolean; // 扩展是否启用（所有条目启用时为true）
}

// 扩展条目匹配模式 - 匹配以"[扩展]"开头的条目
const EXTENSION_PATTERN = /^\[扩展\]/;

// 提取扩展Key的正则 - 匹配 "[扩展][扩展名]" 或 "[扩展][扩展名][!互斥条目]" 格式
const EXTENSION_KEY_PATTERN = /^(\[扩展\]\[[^\]]+\](?:\[![^\]]+\])?)/;

// 提取扩展显示名称的正则 - 匹配 "[扩展][扩展名]" 中的扩展名
const EXTENSION_LABEL_PATTERN = /^\[扩展\]\[([^\]]+)\]/;

// 提取互斥目标的正则 - 匹配 "[!互斥条目]" 中的互斥条目名
const EXTENSION_EXCLUSION_PATTERN = /\[!([^\]]+)\]/;

/**
 * 扩展状态初始值
 */
export const initialExtensionState = {
  extensionOptions: [] as ExtensionOption[],
  localExtensionSelections: new Map<string, boolean>(),
};

/**
 * 解析角色条目名称，提取角色名、作者和其他信息
 * @param entryName 完整条目名称，如 "[角色]薇薇拉(K1nn-原创角色)"
 * @returns { label: string, author: string, info: string }
 */
function parseCharacterName(entryName: string): { label: string; author: string; info: string } {
  // 去掉"[角色]"前缀
  const nameWithAuthor = entryName.replace(CHARACTER_PATTERN, '');

  // 解析角色名和作者-信息
  const match = nameWithAuthor.match(CHARACTER_NAME_PATTERN);
  if (match) {
    const authorInfo = match[2]?.trim() || '';
    // 检查是否包含 "-" 分隔符
    const dashIndex = authorInfo.indexOf('-');
    if (dashIndex > 0) {
      return {
        label: match[1].trim(),
        author: authorInfo.substring(0, dashIndex).trim(),
        info: authorInfo.substring(dashIndex + 1).trim(),
      };
    }
    return {
      label: match[1].trim(),
      author: authorInfo,
      info: '',
    };
  }

  return { label: nameWithAuthor, author: '', info: '' };
}

/**
 * 加载角色列表
 */
export async function loadCharacterOptions(): Promise<{
  characterOptions: CharacterOption[];
  localCharacterSelections: Map<string, boolean>;
  bookName: string | null;
}> {
  const bookName = getWorldBookName();
  const entries = await getFilteredEntries(CHARACTER_PATTERN, bookName);

  const characterOptions = entries.map((entry: { name: string; enabled: boolean }) => {
    const { label, author, info } = parseCharacterName(entry.name);
    return {
      value: entry.name,
      label,
      author,
      info,
      enabled: entry.enabled,
    };
  });

  // 初始化本地选择列表（从世界书的原始状态复制）
  const localCharacterSelections = new Map(
    characterOptions.map(char => [char.value, char.enabled]),
  );

  return { characterOptions, localCharacterSelections, bookName };
}

/**
 * 切换角色启用状态（更新本地状态，返回新的选择Map）
 */
export function toggleCharacter(
  localCharacterSelections: Map<string, boolean>,
  characterValue: string,
): Map<string, boolean> {
  const newSelections = new Map(localCharacterSelections);
  const currentEnabled = newSelections.get(characterValue) ?? false;
  newSelections.set(characterValue, !currentEnabled);
  return newSelections;
}

/**
 * 检查本地选择是否与原始状态有变化
 */
export function hasCharacterChanges(
  characterOptions: CharacterOption[],
  localCharacterSelections: Map<string, boolean>,
): boolean {
  for (const char of characterOptions) {
    const localEnabled = localCharacterSelections.get(char.value) ?? false;
    if (localEnabled !== char.enabled) {
      return true;
    }
  }
  return false;
}

/**
 * 保存角色选择到世界书
 * @param characterOptions 角色选项列表
 * @param localCharacterSelections 本地选择状态
 * @param bookName 世界书名称
 * @returns 更新后的角色选项列表
 */
export async function saveCharacterChanges(
  characterOptions: CharacterOption[],
  localCharacterSelections: Map<string, boolean>,
  bookName: string,
): Promise<CharacterOption[]> {
  if (!hasCharacterChanges(characterOptions, localCharacterSelections)) {
    return characterOptions;
  }

  // 构建更新列表
  const updatedEntries = Array.from(localCharacterSelections).map(([name, enabled]) => ({
    name,
    enabled,
  }));

  await updateWorldBook(updatedEntries, bookName);

  // 返回更新后的角色选项列表
  return characterOptions.map(char => ({
    ...char,
    enabled: localCharacterSelections.get(char.value) ?? false,
  }));
}

// ========================
// 事件相关函数
// ========================

/**
 * 从条目名称中提取事件Key
 * @param entryName 完整条目名称，如 "[事件][双子]双子星的咏叹调-本体"
 * @returns 事件Key，如 "[事件][双子]"，如果不匹配则返回null
 */
function extractEventKey(entryName: string): string | null {
  const match = entryName.match(EVENT_KEY_PATTERN);
  return match ? match[1] : null;
}

/**
 * 从事件Key中提取显示名称
 * @param eventKey 事件Key，如 "[事件][双子]"
 * @returns 显示名称，如 "双子"
 */
function extractEventLabel(eventKey: string): string {
  const match = eventKey.match(EVENT_LABEL_PATTERN);
  return match ? match[1] : eventKey;
}

/**
 * 从事件条目中提取作者和信息
 * @param entries 事件下的所有条目
 * @returns { author: string, info: string }
 */
function extractEventAuthorInfo(entries: EventEntry[]): { author: string; info: string } {
  for (const entry of entries) {
    const match = entry.name.match(AUTHOR_PATTERN);
    if (match) {
      const authorInfo = match[1].trim();
      const dashIndex = authorInfo.indexOf('-');
      if (dashIndex > 0) {
        return {
          author: authorInfo.substring(0, dashIndex).trim(),
          info: authorInfo.substring(dashIndex + 1).trim(),
        };
      }
      return { author: authorInfo, info: '' };
    }
  }
  return { author: '', info: '' };
}

/**
 * 加载事件列表
 */
export async function loadEventOptions(): Promise<{
  eventOptions: EventOption[];
  localEventSelections: Map<string, boolean>;
  bookName: string | null;
}> {
  const bookName = getWorldBookName();
  const entries = await getFilteredEntries(EVENT_PATTERN, bookName);

  // 按事件Key分组条目
  const eventGroups = new Map<string, EventEntry[]>();

  for (const entry of entries as { name: string; enabled: boolean }[]) {
    const eventKey = extractEventKey(entry.name);
    if (!eventKey) continue;

    if (!eventGroups.has(eventKey)) {
      eventGroups.set(eventKey, []);
    }
    eventGroups.get(eventKey)!.push({
      name: entry.name,
      enabled: entry.enabled,
    });
  }

  // 构建事件选项列表
  const eventOptions: EventOption[] = [];
  for (const [eventKey, groupEntries] of eventGroups) {
    // 事件启用状态：所有条目都启用时为true
    const allEnabled = groupEntries.every(e => e.enabled);
    const { author, info } = extractEventAuthorInfo(groupEntries);
    eventOptions.push({
      eventKey,
      label: extractEventLabel(eventKey),
      author,
      info,
      entries: groupEntries,
      enabled: allEnabled,
    });
  }

  // 初始化本地选择列表（从分组状态复制）
  const localEventSelections = new Map(eventOptions.map(event => [event.eventKey, event.enabled]));

  return { eventOptions, localEventSelections, bookName };
}

/**
 * 切换事件启用状态（更新本地状态，返回新的选择Map）
 */
export function toggleEvent(
  localEventSelections: Map<string, boolean>,
  eventKey: string,
): Map<string, boolean> {
  const newSelections = new Map(localEventSelections);
  const currentEnabled = newSelections.get(eventKey) ?? false;
  newSelections.set(eventKey, !currentEnabled);
  return newSelections;
}

/**
 * 检查本地事件选择是否与原始状态有变化
 */
export function hasEventChanges(
  eventOptions: EventOption[],
  localEventSelections: Map<string, boolean>,
): boolean {
  for (const event of eventOptions) {
    const localEnabled = localEventSelections.get(event.eventKey) ?? false;
    if (localEnabled !== event.enabled) {
      return true;
    }
  }
  return false;
}

/**
 * 保存事件选择到世界书
 * @param eventOptions 事件选项列表
 * @param localEventSelections 本地选择状态
 * @param bookName 世界书名称
 * @returns 更新后的事件选项列表
 */
export async function saveEventChanges(
  eventOptions: EventOption[],
  localEventSelections: Map<string, boolean>,
  bookName: string,
): Promise<EventOption[]> {
  if (!hasEventChanges(eventOptions, localEventSelections)) {
    return eventOptions;
  }

  // 构建更新列表：将每个事件的所有条目设置为相同的启用状态
  const updatedEntries: Array<{ name: string; enabled: boolean }> = [];

  for (const event of eventOptions) {
    const newEnabled = localEventSelections.get(event.eventKey) ?? false;
    for (const entry of event.entries) {
      updatedEntries.push({
        name: entry.name,
        enabled: newEnabled,
      });
    }
  }

  await updateWorldBook(updatedEntries, bookName);

  // 返回更新后的事件选项列表
  return eventOptions.map(event => {
    const newEnabled = localEventSelections.get(event.eventKey) ?? false;
    return {
      ...event,
      enabled: newEnabled,
      entries: event.entries.map(entry => ({
        ...entry,
        enabled: newEnabled,
      })),
    };
  });
}

// ========================
// 扩展相关函数
// ========================

/**
 * 从条目名称中提取扩展Key
 * @param entryName 完整条目名称，如 "[扩展][无尽深渊地城扩展][!原版无尽深渊地城]无尽深渊地城-控制(Hilo)"
 * @returns 扩展Key，如 "[扩展][无尽深渊地城扩展][!原版无尽深渊地城]"，如果不匹配则返回null
 */
function extractExtensionKey(entryName: string): string | null {
  const match = entryName.match(EXTENSION_KEY_PATTERN);
  return match ? match[1] : null;
}

/**
 * 从扩展Key中提取显示名称
 * @param extensionKey 扩展Key，如 "[扩展][无尽深渊地城扩展][!原版无尽深渊地城]"
 * @returns 显示名称，如 "无尽深渊地城扩展"
 */
function extractExtensionLabel(extensionKey: string): string {
  const match = extensionKey.match(EXTENSION_LABEL_PATTERN);
  return match ? match[1] : extensionKey;
}

/**
 * 从扩展Key中提取互斥目标
 * @param extensionKey 扩展Key，如 "[扩展][无尽深渊地城扩展][!原版无尽深渊地城]"
 * @returns 互斥目标，如 "原版无尽深渊地城"，如果没有则返回null
 */
function extractExclusionTarget(extensionKey: string): string | null {
  const match = extensionKey.match(EXTENSION_EXCLUSION_PATTERN);
  return match ? match[1] : null;
}

/**
 * 从扩展条目中提取作者和信息
 * @param entries 扩展下的所有条目
 * @returns { author: string, info: string }
 */
function extractExtensionAuthorInfo(entries: ExtensionEntry[]): { author: string; info: string } {
  for (const entry of entries) {
    const match = entry.name.match(AUTHOR_PATTERN);
    if (match) {
      const authorInfo = match[1].trim();
      const dashIndex = authorInfo.indexOf('-');
      if (dashIndex > 0) {
        return {
          author: authorInfo.substring(0, dashIndex).trim(),
          info: authorInfo.substring(dashIndex + 1).trim(),
        };
      }
      return { author: authorInfo, info: '' };
    }
  }
  return { author: '', info: '' };
}

/**
 * 加载扩展列表
 */
export async function loadExtensionOptions(): Promise<{
  extensionOptions: ExtensionOption[];
  localExtensionSelections: Map<string, boolean>;
  bookName: string | null;
}> {
  const bookName = getWorldBookName();
  const entries = await getFilteredEntries(EXTENSION_PATTERN, bookName);

  // 按扩展Key分组条目
  const extensionGroups = new Map<string, ExtensionEntry[]>();

  for (const entry of entries as { name: string; enabled: boolean }[]) {
    const extensionKey = extractExtensionKey(entry.name);
    if (!extensionKey) continue;

    if (!extensionGroups.has(extensionKey)) {
      extensionGroups.set(extensionKey, []);
    }
    extensionGroups.get(extensionKey)!.push({
      name: entry.name,
      enabled: entry.enabled,
    });
  }

  // 构建扩展选项列表
  const extensionOptions: ExtensionOption[] = [];
  for (const [extensionKey, groupEntries] of extensionGroups) {
    // 扩展启用状态：所有条目都启用时为true
    const allEnabled = groupEntries.every(e => e.enabled);
    const { author, info } = extractExtensionAuthorInfo(groupEntries);
    extensionOptions.push({
      extensionKey,
      label: extractExtensionLabel(extensionKey),
      author,
      info,
      exclusionTarget: extractExclusionTarget(extensionKey),
      entries: groupEntries,
      enabled: allEnabled,
    });
  }

  // 初始化本地选择列表（从分组状态复制）
  const localExtensionSelections = new Map(
    extensionOptions.map(ext => [ext.extensionKey, ext.enabled]),
  );

  return { extensionOptions, localExtensionSelections, bookName };
}

/**
 * 切换扩展启用状态（更新本地状态，返回新的选择Map）
 * 处理互斥逻辑：如果开启的扩展有互斥目标，则关闭所有包含该互斥目标的扩展
 */
export function toggleExtension(
  localExtensionSelections: Map<string, boolean>,
  extensionOptions: ExtensionOption[],
  extensionKey: string,
): Map<string, boolean> {
  const newSelections = new Map(localExtensionSelections);
  const currentEnabled = newSelections.get(extensionKey) ?? false;
  const newEnabled = !currentEnabled;

  newSelections.set(extensionKey, newEnabled);

  // 如果正在启用扩展，处理互斥逻辑
  if (newEnabled) {
    const targetExtension = extensionOptions.find(ext => ext.extensionKey === extensionKey);
    if (targetExtension?.exclusionTarget) {
      const exclusionTarget = targetExtension.exclusionTarget;
      // 查找所有包含 [互斥目标] 的扩展并禁用
      for (const ext of extensionOptions) {
        // 检查扩展Key是否包含 [互斥目标]（注意不是 [!互斥目标]）
        if (
          ext.extensionKey !== extensionKey &&
          ext.extensionKey.includes(`[${exclusionTarget}]`)
        ) {
          newSelections.set(ext.extensionKey, false);
        }
      }
    }
  }

  return newSelections;
}

/**
 * 检查本地扩展选择是否与原始状态有变化
 */
export function hasExtensionChanges(
  extensionOptions: ExtensionOption[],
  localExtensionSelections: Map<string, boolean>,
): boolean {
  for (const ext of extensionOptions) {
    const localEnabled = localExtensionSelections.get(ext.extensionKey) ?? false;
    if (localEnabled !== ext.enabled) {
      return true;
    }
  }
  return false;
}

/**
 * 收集所有被启用扩展的互斥目标
 * @param extensionOptions 扩展选项列表
 * @param localExtensionSelections 本地选择状态
 * @returns 互斥目标数组
 */
function collectExclusionTargets(
  extensionOptions: ExtensionOption[],
  localExtensionSelections: Map<string, boolean>,
): string[] {
  const exclusionTargets: string[] = [];

  for (const ext of extensionOptions) {
    const isEnabled = localExtensionSelections.get(ext.extensionKey) ?? false;
    if (isEnabled && ext.exclusionTarget) {
      exclusionTargets.push(ext.exclusionTarget);
    }
  }

  return exclusionTargets;
}

/**
 * 保存扩展选择到世界书
 * @param extensionOptions 扩展选项列表
 * @param localExtensionSelections 本地选择状态
 * @param bookName 世界书名称
 * @returns 更新后的扩展选项列表
 */
export async function saveExtensionChanges(
  extensionOptions: ExtensionOption[],
  localExtensionSelections: Map<string, boolean>,
  bookName: string,
): Promise<ExtensionOption[]> {
  if (!hasExtensionChanges(extensionOptions, localExtensionSelections)) {
    return extensionOptions;
  }

  // 构建更新列表：将每个扩展的所有条目设置为相同的启用状态
  const updatedEntries: Array<{ name: string; enabled: boolean }> = [];

  for (const ext of extensionOptions) {
    const newEnabled = localExtensionSelections.get(ext.extensionKey) ?? false;
    for (const entry of ext.entries) {
      updatedEntries.push({
        name: entry.name,
        enabled: newEnabled,
      });
    }
  }

  // 收集所有被启用扩展的互斥目标
  const exclusionTargets = collectExclusionTargets(extensionOptions, localExtensionSelections);

  // 处理互斥逻辑：禁用包含 [互斥目标] 的条目
  if (exclusionTargets.length > 0) {
    // 为每个互斥目标创建匹配模式，匹配包含 [互斥目标] 的条目
    for (const target of exclusionTargets) {
      const pattern = new RegExp(`\\[${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`);
      const matchingEntries = await getFilteredEntries(pattern, bookName);

      for (const entry of matchingEntries as { name: string; enabled: boolean }[]) {
        // 检查是否已经在更新列表中
        const existingIndex = updatedEntries.findIndex(e => e.name === entry.name);
        if (existingIndex === -1) {
          updatedEntries.push({
            name: entry.name,
            enabled: false,
          });
        } else {
          // 如果已存在，确保设置为禁用
          updatedEntries[existingIndex].enabled = false;
        }
      }
    }
  }

  await updateWorldBook(updatedEntries, bookName);

  // 返回更新后的扩展选项列表
  return extensionOptions.map(ext => {
    const newEnabled = localExtensionSelections.get(ext.extensionKey) ?? false;
    return {
      ...ext,
      enabled: newEnabled,
      entries: ext.entries.map(entry => ({
        ...entry,
        enabled: newEnabled,
      })),
    };
  });
}
