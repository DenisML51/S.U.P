import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Settings, CheckCircle2, XCircle } from 'lucide-react';
import { Character, Resource, Ability } from '../../../../types';
import { getLucideIcon } from '../../../../utils/iconUtils';
import { MarkdownEditor } from '../../../MarkdownEditor';

interface AbilitiesTabProps {
  character: Character;
  openResourceModal: (resource?: Resource) => void;
  openAbilityModal: (ability?: Ability) => void;
  openAbilityView: (ability: Ability) => void;
  updateResourceCount: (resourceId: string, delta: number) => void;
  updateCharacter: (character: Character) => void;
  updateAbilitiesNotes: (notes: string) => void;
  getActionTypeLabel: (type: string) => string;
  getActionTypeColor: (type: string) => string;
}

export const AbilitiesTab: React.FC<AbilitiesTabProps> = ({
  character,
  openResourceModal,
  openAbilityModal,
  openAbilityView,
  updateResourceCount,
  updateCharacter,
  updateAbilitiesNotes,
  getActionTypeLabel,
  getActionTypeColor,
}) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">Способности</h3>
        <div className="flex gap-2">
          <button
            onClick={() => openResourceModal()}
            className="px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl hover:shadow-lg transition-all font-semibold text-xs"
          >
            + Ресурс
          </button>
          <button
            onClick={() => openAbilityModal()}
            className="px-3 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl hover:shadow-lg transition-all font-semibold text-xs"
          >
            + Способность
          </button>
        </div>
      </div>

      {/* Resources Section */}
      {character.resources && character.resources.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-dark-border"></div>
            <span className="text-xs text-gray-400 uppercase font-semibold">Ресурсы</span>
            <div className="h-px flex-1 bg-dark-border"></div>
          </div>
          <div className="space-y-3">
            {character.resources.map((resource) => {
              const percentage = resource.max > 0 ? (resource.current / resource.max) * 100 : 0;
              return (
                <motion.div
                  key={resource.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="group relative bg-dark-card/50 rounded-xl border border-dark-border hover:border-blue-500/30 transition-all overflow-hidden p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20 shadow-inner">
                      {getLucideIcon(resource.iconName, { size: 20, className: 'text-blue-400' })}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-end mb-2">
                        <h4 className="font-bold text-sm text-gray-100 truncate">{resource.name}</h4>
                        <div className="text-[10px] font-black tracking-tighter text-gray-400">
                          <span className="text-blue-400 text-sm">{resource.current}</span> / {resource.max}
                        </div>
                      </div>
                      
                      <div className="h-1.5 bg-dark-bg rounded-full overflow-hidden border border-dark-border relative">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.3 }}
                          className={`h-full rounded-full transition-all ${
                            percentage > 75 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                            percentage > 50 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                            percentage > 25 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                            'bg-gradient-to-r from-red-500 to-pink-500'
                          }`}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 ml-2">
                      <button
                        onClick={() => updateResourceCount(resource.id, -1)}
                        disabled={resource.current <= 0}
                        className="w-7 h-7 rounded-lg bg-dark-bg border border-dark-border hover:bg-dark-hover disabled:opacity-30 transition-all font-bold text-gray-300 flex items-center justify-center"
                      >
                        −
                      </button>
                    <button
                      onClick={() => updateResourceCount(resource.id, 1)}
                      disabled={resource.current >= resource.max}
                        className="w-7 h-7 rounded-lg bg-dark-bg border border-dark-border hover:bg-dark-hover disabled:opacity-30 transition-all font-bold text-gray-300 flex items-center justify-center"
                    >
                      +
                    </button>
                    <button
                      onClick={() => openResourceModal(resource)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-200 hover:bg-dark-hover transition-all opacity-0 group-hover:opacity-100 ml-1"
                      title="Настроить"
                    >
                        <Settings className="w-3.5 h-3.5" />
                    </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Abilities Section */}
      {character.abilities && character.abilities.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-dark-border"></div>
            <span className="text-xs text-gray-400 uppercase font-semibold">Способности</span>
            <div className="h-px flex-1 bg-dark-border"></div>
          </div>
          <div className="space-y-3">
            {character.abilities.map((ability) => {
              const usedResource = ability.resourceId ? character.resources.find(r => r.id === ability.resourceId) : null;
              const canUse = usedResource ? usedResource.current >= (ability.resourceCost || 0) : true;
              return (
                <motion.div
                  key={ability.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => openAbilityView(ability)}
                  className="group relative bg-dark-card/50 rounded-xl border border-dark-border hover:border-purple-500/30 transition-all cursor-pointer overflow-hidden p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center border border-purple-500/20 shadow-inner group-hover:scale-110 transition-transform">
                      <Zap className="w-5 h-5 text-purple-400" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-bold text-gray-100 group-hover:text-purple-400 transition-colors truncate">{ability.name}</h4>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shadow-sm ${getActionTypeColor(ability.actionType)}`}>
                          {getActionTypeLabel(ability.actionType)}
                        </span>
                      </div>
                      
                      {(ability.description || (usedResource && ability.resourceCost)) && (
                        <div className="flex items-center gap-2 text-xs mt-0.5">
                          {ability.description && (
                            <span className="text-gray-400 line-clamp-1 italic">{ability.description}</span>
                          )}
                          {usedResource && ability.resourceCost && (
                            <>
                              {ability.description && <span className="text-gray-600">•</span>}
                              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                canUse 
                                  ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                                  : 'bg-red-500/10 border-red-500/30 text-red-400'
                              }`}>
                                {canUse ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                <span>{usedResource.name}: {ability.resourceCost}</span>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); openAbilityModal(ability); }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-200 hover:bg-dark-hover transition-all opacity-0 group-hover:opacity-100"
                      title="Настроить"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {!character.resources?.length && !character.abilities?.length && (
        <div className="text-gray-400 text-center py-12">
          <p className="mb-4">Нет ресурсов и способностей</p>
          <p className="text-sm">Добавьте ресурсы и способности</p>
        </div>
      )}

      {/* Text notes at the end */}
      <div className="mt-6">
        <div className="text-xs text-gray-400 mb-2 uppercase">Заметки</div>
        <MarkdownEditor
          value={character.abilitiesNotes || ''}
          onChange={updateAbilitiesNotes}
          placeholder="Дополнительные заметки о способностях..."
          minHeight="60px"
        />
      </div>
    </div>
  );
};

