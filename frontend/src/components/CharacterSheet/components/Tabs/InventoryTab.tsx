import React from 'react';
import { Backpack, Shield, Sword, Box, Zap, Settings } from 'lucide-react';
import { Character, InventoryItem } from '../../../../types';
import { InventorySubTab } from '../../CharacterSheetLogic';
import { MarkdownEditor } from '../../../MarkdownEditor';
import { MarkdownText } from '../../../MarkdownText';
import { useI18n } from '../../../../i18n/I18nProvider';

interface InventoryTabProps {
  character: Character;
  inventorySubTab: InventorySubTab;
  setInventorySubTab: (subTab: InventorySubTab) => void;
  openItemModal: (item?: InventoryItem) => void;
  openItemView: (item: InventoryItem) => void;
  updateItemQuantity: (itemId: string, delta: number) => void;
  equipItem: (itemId: string) => void;
  unequipItem: (itemId: string) => void;
  updateInventoryNotes: (notes: string) => void;
  getItemIcon: (item: InventoryItem) => any;
  getItemTypeLabel: (type: string) => string;
}

export const InventoryTab: React.FC<InventoryTabProps> = ({
  character,
  inventorySubTab,
  setInventorySubTab,
  openItemModal,
  openItemView,
  updateItemQuantity,
  equipItem,
  unequipItem,
  updateInventoryNotes,
  getItemIcon,
  getItemTypeLabel,
}) => {
  const { t } = useI18n();
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">{t('navbar.inventory')}</h3>
        <button
          onClick={() => openItemModal()}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl hover:shadow-lg hover:shadow-blue-500/50 transition-all font-semibold text-sm"
        >
          + {t('inventoryTab.addItem')}
        </button>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {(['all', 'armor', 'weapon', 'item', 'ammunition'] as InventorySubTab[]).map((subTab) => (
          <button
            key={subTab}
            onClick={() => setInventorySubTab(subTab)}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
              inventorySubTab === subTab
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                : 'bg-dark-card border border-dark-border text-gray-400 hover:border-blue-500/50'
            }`}
          >
            {subTab === 'all' && t('inventoryTab.all')}
            {subTab === 'armor' && t('itemModal.type.armor.label')}
            {subTab === 'weapon' && t('itemModal.type.weapon.label')}
            {subTab === 'item' && t('inventoryTab.items')}
            {subTab === 'ammunition' && t('navbar.ammo')}
          </button>
        ))}
      </div>

      {character.inventory && character.inventory.filter(item => 
        inventorySubTab === 'all' || item.type === inventorySubTab
      ).length > 0 ? (
        <div className="space-y-3">
          {character.inventory.filter(item => 
            inventorySubTab === 'all' || item.type === inventorySubTab
          ).map((item) => {
            const ItemIcon = getItemIcon(item);
            const isWeapon = item.type === 'weapon';
            const isArmor = item.type === 'armor';
            const isConsumable = item.type === 'item' || item.type === 'ammunition';

            return (
              <div
                key={item.id}
                onClick={() => openItemView(item)}
                className={`group relative bg-dark-card/50 rounded-xl border transition-all cursor-pointer overflow-hidden p-4 ${
                  item.equipped ? 'border-blue-500/50 bg-blue-500/5' : 'border-dark-border hover:border-blue-500/30'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner group-hover:scale-110 transition-transform ${
                      item.equipped ? 'bg-blue-500/20 border-blue-500/30' : 'bg-dark-bg border-dark-border'
                    }`}
                    style={item.color && !item.equipped ? { backgroundColor: `${item.color}10`, borderColor: `${item.color}20` } : {}}
                  >
                    <ItemIcon className={`w-5 h-5 ${item.equipped ? 'text-blue-400' : (item.color ? '' : 'text-gray-400')}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`font-bold truncate ${item.equipped ? 'text-blue-400' : 'text-gray-100'}`}>{item.name}</h4>
                      <span className="px-2 py-0.5 bg-dark-bg border border-dark-border text-gray-500 text-[9px] font-black uppercase tracking-wider rounded-full">
                        {getItemTypeLabel(item.type)}
                      </span>
                      {item.equipped && (
                        <span className="px-2 py-0.5 bg-blue-500 text-white text-[9px] font-black uppercase tracking-wider rounded-full shadow-lg shadow-blue-500/20">
                          {t('inventoryTab.equippedShort')}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[10px]">
                      {isWeapon && (
                        <div className="flex items-center gap-1 text-red-400 font-bold">
                          <Sword className="w-3 h-3" />
                          <span>{item.damage}</span>
                          <span className="text-gray-600 font-normal">•</span>
                          <span>{item.damageType}</span>
                        </div>
                      )}
                      {isArmor && (
                        <div className="flex items-center gap-1 text-blue-400 font-bold">
                          <Shield className="w-3 h-3" />
                            <span>{t('limb.ac')} {item.baseAC}</span>
                        </div>
                      )}
                      <div className="text-gray-500 flex items-center gap-1">
                        <span className="font-bold text-gray-400">{item.weight % 1 === 0 ? item.weight : item.weight.toFixed(1)}</span> lb
                      </div>
                      <div className="text-gray-500 flex items-center gap-1">
                        <span className="font-bold text-gray-400">{item.cost}</span> gp
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    {isConsumable && item.quantity !== undefined && (
                      <div className="flex items-center bg-dark-bg border border-dark-border rounded-lg overflow-hidden h-8">
                        <button
                          onClick={() => updateItemQuantity(item.id, -1)}
                          className="w-8 h-full hover:bg-red-500/10 text-red-400 transition-all font-black text-xs"
                        >
                          −
                        </button>
                        <div className="px-2 font-black text-xs min-w-[30px] text-center border-x border-dark-border">
                          {item.quantity}
                        </div>
                        <button
                          onClick={() => updateItemQuantity(item.id, 1)}
                          className="w-8 h-full hover:bg-green-500/10 text-green-400 transition-all font-black text-xs"
                        >
                          +
                        </button>
                      </div>
                    )}

                    {(isArmor || isWeapon) && (
                      <button
                        onClick={() => item.equipped ? unequipItem(item.id) : equipItem(item.id)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                          item.equipped 
                            ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20' 
                            : 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
                        }`}
                      >
                        {item.equipped ? t('inventoryTab.unequip') : t('inventoryTab.equip')}
                      </button>
                    )}

                    <button
                      onClick={() => openItemModal(item)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-200 hover:bg-dark-hover transition-all"
                      title={t('common.edit')}
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-gray-400 text-center py-8">
          <p className="text-sm">{t('inventoryTab.empty')}</p>
        </div>
      )}

      <div className="mt-6">
        <div className="text-xs text-gray-400 mb-2 uppercase">{t('inventoryTab.quickNotes')}</div>
        <MarkdownEditor
          value={character.inventoryNotes || ''}
          onChange={updateInventoryNotes}
          placeholder={t('inventoryTab.notesPlaceholder')}
          minHeight="60px"
        />
      </div>
    </div>
  );
};

