export type KitchenEquipment = {
  id: string;
  name: string;
  important?: boolean;
};

export type EquipmentCategory = {
  id: string;
  name: string;
  icon: string;
  description: string;
  items: KitchenEquipment[];
};

export type KitchenSettings = {
  equipment: string[];
};