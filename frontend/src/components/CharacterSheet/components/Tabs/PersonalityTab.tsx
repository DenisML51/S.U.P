import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Plus, Sparkles, User, History as HistoryLogIcon, Heart, Target, Users, BookOpen, Fingerprint } from 'lucide-react';
import { Character, Trait } from '../../../../types';
import { MarkdownEditor } from '../../../MarkdownEditor';
import { MarkdownText } from '../../../MarkdownText';
import { AvatarUpload } from '../../../AvatarUpload';
import { useI18n } from '../../../../i18n/I18nProvider';

interface PersonalityTabProps {
  character: Character;
  updatePersonalityField: (field: keyof Character, value: any) => void;
  updateLanguagesAndProficiencies: (value: string) => void;
  openTraitModal: (trait?: Trait) => void;
  openTraitView: (trait: Trait) => void;
  setShowBasicInfoModal: (show: boolean) => void;
}

export const PersonalityTab: React.FC<PersonalityTabProps> = ({
  character,
  updatePersonalityField,
  updateLanguagesAndProficiencies,
  openTraitModal,
  openTraitView,
  setShowBasicInfoModal,
}) => {
  const { t } = useI18n();
  return (
    <div className="space-y-10 pb-10 text-gray-100">
      <div className="flex flex-col items-start gap-8 md:flex-row md:items-center">
        <div className="relative scale-[1.28] origin-top-left md:mr-6 md:scale-[1.34]">
          <AvatarUpload
            currentAvatar={character.avatar}
            onAvatarChange={(base64) => updatePersonalityField('avatar', base64)}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-center gap-4">
            <h2 className="truncate text-4xl font-black tracking-tight">{character.name}</h2>
            <button
              onClick={() => setShowBasicInfoModal(true)}
              className="p-2 bg-dark-bg border border-dark-border rounded-xl hover:bg-dark-hover transition-all text-gray-500 hover:text-blue-400"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/8 px-3 py-2">
              <div className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-300/70">Раса</div>
              <div className="mt-1 truncate text-sm font-bold text-blue-100">
                {character.race}
                {character.subrace && ` (${character.subrace})`}
              </div>
            </div>
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/8 px-3 py-2">
              <div className="text-[9px] font-black uppercase tracking-[0.18em] text-purple-300/70">Класс</div>
              <div className="mt-1 truncate text-sm font-bold text-purple-100">
                {character.class}
                {character.subclass && ` • ${character.subclass}`}
              </div>
            </div>
            <div className="rounded-xl border border-pink-500/20 bg-pink-500/8 px-3 py-2">
              <div className="text-[9px] font-black uppercase tracking-[0.18em] text-pink-300/70">Мировоззрение</div>
              <div className="mt-1 truncate text-sm font-bold text-pink-100">
                {character.alignment || t('personality.noAlignment')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center border border-purple-500/20">
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold tracking-tight text-gray-200">{t('personality.traits')}</h3>
          </div>
          <button
            onClick={() => openTraitModal()}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-xl hover:bg-purple-500/20 transition-all text-purple-400 text-xs font-black uppercase tracking-widest shadow-sm"
          >
            <Plus className="w-3 h-3" />
            {t('common.add')}
          </button>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {(character.traits || []).map((trait) => (
            <motion.div
              key={trait.id}
              whileHover={{ y: -4 }}
              onClick={() => openTraitView(trait)}
              className="group relative bg-dark-card/40 border border-dark-border rounded-2xl p-5 hover:border-purple-500/30 transition-all cursor-pointer shadow-lg overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openTraitModal(trait);
                  }}
                  className="p-1.5 bg-dark-bg border border-dark-border rounded-lg text-gray-500 hover:text-white"
                >
                  <Settings className="w-3 h-3" />
                </button>
              </div>
              <h4 className="font-black text-lg mb-2 text-gray-100 group-hover:text-purple-400 transition-colors">{trait.name}</h4>
              {trait.description && (
                <div className="text-sm text-gray-500 line-clamp-2 italic leading-relaxed">
                  <MarkdownText content={trait.description} />
                </div>
              )}
            </motion.div>
          ))}
          
          {(character.traits || []).length === 0 && (
            <button
              onClick={() => openTraitModal()}
              className="col-span-full py-12 bg-dark-bg/30 border-2 border-dashed border-dark-border rounded-3xl text-gray-500 hover:text-gray-300 hover:border-dark-hover transition-all flex flex-col items-center gap-3"
            >
              <Plus className="w-8 h-8 opacity-20" />
              <span className="text-sm font-bold opacity-50 uppercase tracking-widest">{t('personality.emptyTraits')}</span>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-10">
        <div className="space-y-8">
          <SectionHeader icon={Fingerprint} label={t('personality.appearanceOrigin')} color="blue" />
          
          <div className="space-y-6">
            <EditorField 
              label={t('personality.appearance')} 
              value={character.appearance} 
              placeholder={t('personality.appearancePlaceholder')}
              onChange={(val) => updatePersonalityField('appearance', val)}
            />
            <EditorField 
              label={t('personality.backstory')} 
              value={character.backstory} 
              rows={10}
              placeholder={t('personality.backstoryPlaceholder')}
              onChange={(val) => updatePersonalityField('backstory', val)}
            />
          </div>
        </div>

        <div className="space-y-8">
          <SectionHeader icon={Heart} label={t('personality.characterPsychology')} color="pink" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <EditorField 
              label={t('personality.personalityTraits')} 
              value={character.personalityTraits} 
              placeholder={t('personality.personalityTraitsPlaceholder')}
              onChange={(val) => updatePersonalityField('personalityTraits', val)}
            />
            <EditorField 
              label={t('personality.ideals')} 
              value={character.ideals} 
              placeholder={t('personality.idealsPlaceholder')}
              onChange={(val) => updatePersonalityField('ideals', val)}
            />
            <EditorField 
              label={t('personality.bonds')} 
              value={character.bonds} 
              placeholder={t('personality.bondsPlaceholder')}
              onChange={(val) => updatePersonalityField('bonds', val)}
            />
            <EditorField 
              label={t('personality.flaws')} 
              value={character.flaws} 
              placeholder={t('personality.flawsPlaceholder')}
              onChange={(val) => updatePersonalityField('flaws', val)}
            />
          </div>

          <div className="space-y-10">
            <div className="space-y-4">
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 group-hover:text-gray-400 transition-colors">
                {t('personality.alignment')}
              </label>
              <input
                type="text"
                value={character.alignment || ''}
                onChange={(e) => updatePersonalityField('alignment', e.target.value)}
                className="w-full bg-dark-card/20 border border-dark-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder={t('personality.alignmentPlaceholder')}
              />
            </div>

            <div className="space-y-6">
              <SectionHeader icon={Users} label={t('personality.connectionsSkills')} color="purple" small />
              <div className="space-y-6">
                <EditorField 
                  label={t('personality.alliesOrganizations')} 
                  value={character.alliesAndOrganizations} 
                  placeholder={t('personality.alliesOrganizationsPlaceholder')}
                  onChange={(val) => updatePersonalityField('alliesAndOrganizations', val)}
                />
                <EditorField 
                  label={t('personality.proficienciesLanguages')} 
                  value={character.languagesAndProficiencies} 
                  placeholder={t('personality.proficienciesLanguagesPlaceholder')}
                  onChange={updateLanguagesAndProficiencies}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SectionHeader: React.FC<{ icon: any, label: string, color: string, small?: boolean }> = ({ icon: Icon, label, color, small }) => (
  <div className={`flex items-center gap-3 px-1 ${small ? 'mt-4' : ''}`}>
    <div className={`w-8 h-8 bg-dark-card border border-dark-border rounded-lg flex items-center justify-center shadow-inner`}>
      <Icon className={`w-4 h-4 text-${color}-400`} />
    </div>
    <h3 className={`${small ? 'text-md' : 'text-xl'} font-bold tracking-tight text-gray-300`}>{label}</h3>
  </div>
);

const EditorField: React.FC<{ label: string, value: string, placeholder: string, rows?: number, onChange: (val: string) => void }> = ({ label, value, placeholder, rows = 4, onChange }) => (
  <div className="space-y-2 group">
    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 group-hover:text-gray-400 transition-colors">
      {label}
    </label>
    <MarkdownEditor
      value={value || ''}
      onChange={onChange}
      rows={rows}
      placeholder={placeholder}
      className="bg-dark-card/20 border-dark-border hover:border-gray-700 focus:border-blue-500/50"
    />
  </div>
);

