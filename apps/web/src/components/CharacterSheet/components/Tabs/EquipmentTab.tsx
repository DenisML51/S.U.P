import React from 'react';
import { Backpack, Zap, Sword, Shield } from 'lucide-react';
import { Character, InventoryItem } from '../../../../types';
import { MarkdownEditor } from '../../../MarkdownEditor';
import { MarkdownText } from '../../../MarkdownText';

interface EquipmentTabProps {
  character: Character;
  setShowAmmunitionModal: (show: boolean) => void;
  openItemView: (item: any) => void;
  unequipItem: (itemId: string) => void;
  updateEquipmentNotes: (notes: string) => void;
  getItemIcon: (item: InventoryItem) => any;
  getItemTypeLabel: (type: string) => string;
}

export const EquipmentTab: React.FC<EquipmentTabProps> = ({
  character,
  setShowAmmunitionModal,
  openItemView,
  unequipItem,
  updateEquipmentNotes,
  getItemIcon,
  getItemTypeLabel,
}) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">Снаряжение</h3>
        <button
          onClick={() => setShowAmmunitionModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl hover:shadow-lg transition-all font-semibold text-sm flex items-center gap-2"
        >
          <Zap className="w-4 h-4" />
          Боеприпасы
        </button>
      </div>

      {character.inventory && character.inventory.filter(i => i.equipped).length > 0 ? (
        <div className="space-y-3">
          {character.inventory.filter(i => i.equipped).map((item) => {
            const ItemIcon = getItemIcon(item);
            const isWeapon = item.type === 'weapon';
            const isArmor = item.type === 'armor';

            return (
              <div
                key={item.id}
                onClick={() => openItemView(item)}
                className="group relative bg-dark-card/50 rounded-xl border-2 border-blue-500/30 bg-blue-500/5 transition-all cursor-pointer overflow-hidden p-4 hover:border-blue-500/50"
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform"
                    style={item.color ? { backgroundColor: `${item.color}20`, borderColor: `${item.color}30` } : {}}
                  >
                    <ItemIcon className={`w-5 h-5 ${item.color ? '' : 'text-blue-400'}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-gray-100 truncate">{item.name}</h4>
                      <span className="px-2 py-0.5 bg-dark-bg border border-dark-border text-gray-500 text-[9px] font-black uppercase tracking-wider rounded-full">
                        {getItemTypeLabel(item.type)}
                      </span>
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
                          <span>КБ {item.baseAC}</span>
                        </div>
                      )}
                      <div className="text-gray-500 flex items-center gap-1">
                        <span className="font-bold text-gray-400">{item.weight % 1 === 0 ? item.weight : item.weight.toFixed(1)}</span> lb
                      </div>
                      <div className="text-gray-500 flex items-center gap-1">
                        <span className="font-bold text-gray-400">{item.cost} gp</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); unequipItem(item.id); }}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all"
                  >
                    Снять
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-gray-400 text-center py-12">
          <Backpack className="w-8 h-8 mx-auto mb-2 text-gray-500" />
          <p className="text-sm">Нет экипированных предметов</p>
          <p className="text-xs mt-1">Экипируйте предметы из инвентаря</p>
        </div>
      )}

      <div className="mt-6">
        <div className="text-xs text-gray-400 mb-2 uppercase">Заметки</div>
        <MarkdownEditor
          value={character.equipmentNotes || ''}
          onChange={updateEquipmentNotes}
          placeholder="Дополнительные заметки о снаряжении..."
          minHeight="60px"
        />
      </div>
    </div>
  );
};

