import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Rarity } from '../types';

/**
 * 自定义内容 Store
 * 管理所有用户自定义输入的内容，实现跨页面状态持久化
 */
export const useCustomContentStore = defineStore('customContent', () => {
  /**
   * 自定义开局剧情描述
   */
  const customBackgroundDescription = ref('');

  /**
   * 更新自定义开局描述
   */
  const updateCustomBackgroundDescription = (value: string) => {
    customBackgroundDescription.value = value;
  };

  /**
   * 自定义物品表单数据
   */
  const customItemForm = ref({
    categoryType: 'equipment' as 'equipment' | 'item' | 'skill',
    customItemType: '',
    itemName: '',
    itemRarity: 'common' as Rarity,
    itemTag: '',
    itemEffect: '',
    itemDescription: '',
    itemConsume: '',
    itemQuantity: 1,
  });

  /**
   * 更新自定义物品表单
   */
  const updateCustomItemForm = (field: keyof typeof customItemForm.value, value: any) => {
    customItemForm.value[field] = value as never;
  };

  /**
   * 重置自定义物品表单
   */
  const resetCustomItemForm = () => {
    customItemForm.value = {
      categoryType: 'equipment',
      customItemType: '',
      itemName: '',
      itemRarity: 'common' as Rarity,
      itemTag: '',
      itemEffect: '',
      itemDescription: '',
      itemConsume: '',
      itemQuantity: 1,
    };
  };

  /**
   * 自定义命定之人表单数据
   */
  const customDestinedOneForm = ref({
    itemName: '',
    itemLevel: 1,
    itemLifeLevel: '',
    itemGrade: 1,
    itemRace: '',
    itemIdentity: '',
    itemCareer: '',
    itemPersonality: '',
    itemLike: '',
    itemApp: '',
    itemCloth: '',
    itemEquip: '',
    itemAttributes: '',
    itemStairway: '',
    itemIsContract: '是',
    itemAffinity: 0,
    itemComment: '',
    itemBackgroundInfo: '',
    itemSkills: '',
  });

  /**
   * 更新自定义命定之人表单
   */
  const updateCustomDestinedOneForm = (
    field: keyof typeof customDestinedOneForm.value,
    value: any,
  ) => {
    customDestinedOneForm.value[field] = value as never;
  };

  /**
   * 重置自定义命定之人表单
   */
  const resetCustomDestinedOneForm = () => {
    customDestinedOneForm.value = {
      itemName: '',
      itemLevel: 1,
      itemLifeLevel: '',
      itemGrade: 1,
      itemRace: '',
      itemIdentity: '',
      itemCareer: '',
      itemPersonality: '',
      itemLike: '',
      itemApp: '',
      itemCloth: '',
      itemEquip: '',
      itemAttributes: '',
      itemStairway: '',
      itemIsContract: '是',
      itemAffinity: 0,
      itemComment: '',
      itemBackgroundInfo: '',
      itemSkills: '',
    };
  };

  /**
   * 重置所有自定义内容
   */
  const resetAll = () => {
    customBackgroundDescription.value = '';
    resetCustomItemForm();
    resetCustomDestinedOneForm();
  };

  return {
    // 自定义开局描述
    customBackgroundDescription,
    updateCustomBackgroundDescription,

    // 自定义物品表单
    customItemForm,
    updateCustomItemForm,
    resetCustomItemForm,

    // 自定义命定之人表单
    customDestinedOneForm,
    updateCustomDestinedOneForm,
    resetCustomDestinedOneForm,

    // 全局重置
    resetAll,
  };
});
