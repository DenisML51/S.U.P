import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Character } from '../types';
import { ATTRIBUTES_LIST, SKILLS_LIST, calculateMaxSanity } from '../types';
import { CONDITIONS } from '../constants/conditions';

const loadFonts = async () => {
  const fontId = 'medieval-fonts-link';
  if (!document.getElementById(fontId)) {
    const link = document.createElement('link');
    link.id = fontId;
    link.href = 'https://fonts.googleapis.com/css2?family=Almendra:ital,wght@0,400;0,700;1,400;1,700&family=MedievalSharp&family=Inter:wght@400;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  
  try {
    await Promise.race([
      document.fonts.ready,
      new Promise(resolve => setTimeout(resolve, 3000))
    ]);
  } catch (e) {
    console.warn('Font loading timeout or error', e);
  }
};

export const exportToPDF = async (character: Character) => {
  await loadFonts();
  const loadingToast = document.createElement('div');
  loadingToast.style.position = 'fixed';
  loadingToast.style.bottom = '20px';
  loadingToast.style.left = '50%';
  loadingToast.style.transform = 'translateX(-50%)';
  loadingToast.style.backgroundColor = '#1a1a1a';
  loadingToast.style.color = '#fff';
  loadingToast.style.padding = '12px 24px';
  loadingToast.style.borderRadius = '12px';
  loadingToast.style.border = '1px solid #333';
  loadingToast.style.zIndex = '9999';
  loadingToast.style.fontSize = '14px';
  loadingToast.innerText = 'Подготовка PDF...';
  document.body.appendChild(loadingToast);

  const container = document.createElement('div');
  container.className = 'pdf-export-container';
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = '794px'; 
  container.style.zIndex = '-1';
  container.style.opacity = '0.01';
  container.style.pointerEvents = 'none';
  container.style.backgroundColor = '#f4e4bc';
  container.style.color = '#2c1810';
  

  const ornamentTop = `<svg width="100%" height="20" viewBox="0 0 400 20" preserveAspectRatio="none"><path d="M0 10 Q100 0 200 10 Q300 20 400 10" fill="none" stroke="#2c1810" stroke-width="1" opacity="0.5"/></svg>`;
  
  const sectionTitle = (title: string) => `
    <div style="display: flex; align-items: center; margin-bottom: 15px;">
      <div style="height: 1px; flex: 1; background: linear-gradient(to right, transparent, #2c1810, transparent); opacity: 0.3;"></div>
      <h3 style="font-family: 'MedievalSharp', cursive; font-size: 18px; margin: 0 15px; color: #2c1810; text-transform: uppercase; letter-spacing: 1px;">${title}</h3>
      <div style="height: 1px; flex: 1; background: linear-gradient(to right, transparent, #2c1810, transparent); opacity: 0.3;"></div>
    </div>
  `;

  container.innerHTML = `
    <style>
      .pdf-page {
        padding: 40px;
        box-sizing: border-box;
        position: relative;
        background-color: #f4e4bc !important;
        background-image: radial-gradient(#d4c4a1 1px, transparent 1px);
        background-size: 20px 20px;
        min-height: 1120px; 
        height: auto;
        overflow: visible;
      }
      .section-block {
        margin-bottom: 20px;
        padding: 15px;
        border: 1px solid rgba(44, 24, 16, 0.15);
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        position: relative;
      }
      .section-block::before {
        content: '❦';
        position: absolute;
        top: -10px;
        left: 50%;
        transform: translateX(-50%);
        background: #f4e4bc;
        padding: 0 10px;
        font-size: 12px;
        color: #2c1810;
        opacity: 0.6;
      }
      .stat-box {
        background: rgba(44, 24, 16, 0.05);
        border: 1px solid rgba(44, 24, 16, 0.2);
        padding: 10px;
        text-align: center;
        border-radius: 4px;
      }
      .stat-label {
        font-size: 10px;
        text-transform: uppercase;
        color: #5c3d2e;
        margin-bottom: 4px;
        font-weight: 700;
      }
      .stat-value {
        font-family: 'MedievalSharp', cursive;
        font-size: 20px;
        color: #2c1810;
      }
      .spell-card, .attack-card, .ability-card {
        border-bottom: 1px dashed rgba(44, 24, 16, 0.2);
        padding: 10px 0;
      }
      .spell-card:last-child, .attack-card:last-child, .ability-card:last-child {
        border-bottom: none;
      }
    </style>

    <div class="pdf-page">
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px double #2c1810; padding-bottom: 20px;">
        <div style="font-family: 'MedievalSharp', cursive; font-size: 14px; opacity: 0.6; margin-bottom: 5px;">INTO THE DARK</div>
        <h1 style="font-family: 'MedievalSharp', cursive; font-size: 38px; margin: 0; letter-spacing: 4px; color: #2c1810;">ЛИСТ ПЕРСОНАЖА</h1>
        <div style="margin-top: 15px; font-size: 16px;">
          ${character.name ? `<span style="font-family: 'MedievalSharp', cursive; font-size: 28px;">${character.name}</span><br>` : ''}
          <span style="opacity: 0.8;">
            ${character.race} • ${character.class}${character.subclass ? ` (${character.subclass})` : ''} • Уровень ${character.level || 1}
          </span>
        </div>
      </div>

      <div style="display: flex; gap: 20px;">
        ${character.avatar ? `
          <div style="flex: 0 0 150px;">
            <img src="${character.avatar}" style="width: 150px; height: 150px; object-fit: cover; border: 3px solid #2c1810; padding: 3px; background: white; border-radius: 4px;" />
          </div>
        ` : ''}
        
        <div style="flex: 1;">
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
            <div class="stat-box">
              <div class="stat-label">Здоровье</div>
              <div class="stat-value" style="color: #8b0000;">${character.currentHP || 0}${character.tempHP > 0 ? `+${character.tempHP}` : ''} / ${(character.maxHP || 0) + (character.maxHPBonus || 0)}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Рассудок</div>
              <div class="stat-value" style="color: #00008b;">${character.sanity || 0} / ${calculateMaxSanity(character.class, character.attributes.wisdom || 10, character.level || 1)}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">КБ</div>
              <div class="stat-value">${character.armorClass || 10}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Опыт</div>
              <div class="stat-value">${character.experience || 0}</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
            <div class="stat-box">
              <div class="stat-label">Инициатива</div>
              <div class="stat-value">${Math.floor(((character.attributes.dexterity || 10) - 10) / 2) >= 0 ? '+' : ''}${Math.floor(((character.attributes.dexterity || 10) - 10) / 2)}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Скорость</div>
              <div class="stat-value">${character.speed || 30} фт</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Бонус влад.</div>
              <div class="stat-value">+${character.proficiencyBonus || 2}</div>
            </div>
          </div>
        </div>
      </div>

      <div style="margin-top: 30px; display: grid; grid-template-columns: 220px 1fr; gap: 25px;">
        <div>
          ${sectionTitle('Характеристики')}
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${ATTRIBUTES_LIST.map(attr => {
              const value = character.attributes[attr.id] || 10;
              const bonus = character.attributeBonuses?.[attr.id] || 0;
              const modifier = Math.floor((value - 10) / 2) + bonus;
              const modifierStr = modifier >= 0 ? `+${modifier}` : `${modifier}`;
              return `
                <div style="display: flex; align-items: center; background: rgba(44, 24, 16, 0.05); padding: 5px 10px; border-radius: 4px; border: 1px solid rgba(44, 24, 16, 0.1);">
                  <div style="flex: 1;">
                    <div style="font-size: 10px; font-weight: 700; text-transform: uppercase;">${attr.name}</div>
                    <div style="font-size: 16px; font-weight: 700;">${value}</div>
                  </div>
                  <div style="font-family: 'MedievalSharp', cursive; font-size: 22px; color: #2c1810;">${modifierStr}</div>
                </div>
              `;
            }).join('')}
          </div>

          <div style="margin-top: 25px;">
            ${sectionTitle('Навыки')}
            <div style="font-size: 12px; display: flex; flex-direction: column; gap: 3px;">
              ${SKILLS_LIST.map(skillInfo => {
                const skill = (character.skills || []).find(s => s.id === skillInfo.id);
                const attrValue = character.attributes[skillInfo.attribute] || 10;
                const baseModifier = Math.floor((attrValue - 10) / 2);
                const profBonus = skill?.proficient ? (character.proficiencyBonus || 2) : 0;
                const expertiseBonus = skill?.expertise ? (character.proficiencyBonus || 2) : 0;
                const total = baseModifier + profBonus + expertiseBonus;
                const modStr = total >= 0 ? `+${total}` : `${total}`;
                
                return `
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 2px 0; border-bottom: 1px solid rgba(44, 24, 16, 0.05);">
                    <span>${skill?.proficient ? '●' : '○'} ${skillInfo.name} <small style="opacity: 0.6;">(${ATTRIBUTES_LIST.find(a => a.id === skillInfo.attribute)?.shortName})</small></span>
                    <span style="font-weight: 700;">${modStr}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div style="margin-top: 25px;">
            ${sectionTitle('Валюта')}
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 5px; text-align: center;">
              <div style="background: rgba(184, 115, 51, 0.1); padding: 5px; border-radius: 4px;">
                <div style="font-size: 9px; font-weight: 700;">МЕДЬ</div>
                <div style="font-weight: 700;">${character.currency?.copper || 0}</div>
              </div>
              <div style="background: rgba(192, 192, 192, 0.1); padding: 5px; border-radius: 4px;">
                <div style="font-size: 9px; font-weight: 700;">СЕРЕБРО</div>
                <div style="font-weight: 700;">${character.currency?.silver || 0}</div>
              </div>
              <div style="background: rgba(212, 175, 55, 0.1); padding: 5px; border-radius: 4px;">
                <div style="font-size: 9px; font-weight: 700;">ЗОЛОТО</div>
                <div style="font-weight: 700;">${character.currency?.gold || 0}</div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div class="section-block">
            ${sectionTitle('Атаки')}
            ${(character.attacks || []).map(attack => `
              <div class="attack-card">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <strong style="font-size: 14px;">${attack.name}</strong>
                  <span style="font-size: 11px; font-style: italic; opacity: 0.7;">${attack.actionType}</span>
                </div>
                <div style="display: flex; gap: 15px; font-size: 12px;">
                  <span>Попадание: <strong>${attack.hitBonus >= 0 ? '+' : ''}${attack.hitBonus}</strong></span>
                  <span>Урон: <strong>${attack.damage}</strong> (${attack.damageType})</span>
                </div>
                ${attack.description ? `<div style="font-size: 11px; margin-top: 5px; opacity: 0.8; line-height: 1.3;">${attack.description}</div>` : ''}
              </div>
            `).join('')}
            ${(!character.attacks || character.attacks.length === 0) ? '<div style="font-style: italic; opacity: 0.5; font-size: 12px;">Нет атак</div>' : ''}
          </div>

          <div class="section-block">
            ${sectionTitle('Способности и Черты')}
            ${(character.traits || []).map(trait => `
              <div class="ability-card">
                <strong style="font-size: 14px;">${trait.name}</strong>
                <div style="font-size: 11px; margin-top: 3px; opacity: 0.8; line-height: 1.3;">${trait.description}</div>
              </div>
            `).join('')}
            ${(character.abilities || []).map(ability => `
              <div class="ability-card">
                <div style="display: flex; justify-content: space-between;">
                  <strong style="font-size: 14px;">${ability.name}</strong>
                  <span style="font-size: 11px; font-style: italic; opacity: 0.7;">${ability.actionType}</span>
                </div>
                <div style="font-size: 11px; margin-top: 3px; opacity: 0.8; line-height: 1.3;">${ability.effect}</div>
              </div>
            `).join('')}
            ${character.abilitiesNotes ? `
              <div style="margin-top: 10px; padding-top: 5px; border-top: 1px dotted rgba(44, 24, 16, 0.2); font-size: 10px; opacity: 0.7;">
                ${character.abilitiesNotes}
              </div>
            ` : ''}
          </div>

          ${character.limbs && character.limbs.length > 0 ? `
            <div class="section-block">
              ${sectionTitle('Здоровье конечностей')}
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                ${character.limbs.map(limb => `
                  <div style="font-size: 11px; display: flex; justify-content: space-between; border-bottom: 1px solid rgba(44, 24, 16, 0.05);">
                    <span>${limb.name} (КБ ${limb.ac})</span>
                    <strong style="color: ${limb.currentHP <= 0 ? '#8b0000' : 'inherit'}">${limb.currentHP} / ${limb.maxHP}</strong>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    </div>

    <div class="pdf-page">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
        <div>
          ${character.spells && character.spells.length > 0 ? `
            <div class="section-block">
              ${sectionTitle('Заклинания')}
              <div style="display: flex; flex-direction: column; gap: 15px;">
                ${character.spells.map(spell => `
                  <div class="spell-card">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 2px;">
                      <strong style="font-size: 13px;">${spell.name}</strong>
                      <span style="font-size: 8px; font-weight: 700;">${spell.level === 0 ? 'ЗАГОВОР' : `${spell.level} КРУГ`}</span>
                    </div>
                    <div style="font-size: 9px; opacity: 0.7; margin-bottom: 3px;">${spell.school} • ${spell.castingTime} • ${spell.range}</div>
                    <div style="font-size: 10px; line-height: 1.2;">${spell.effect || spell.description}</div>
                  </div>
                `).join('')}
              </div>
              ${character.spellsNotes ? `
                <div style="margin-top: 15px; font-size: 10px; opacity: 0.7; font-style: italic;">
                  ${character.spellsNotes}
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>

        <div>
          <div class="section-block">
            ${sectionTitle('Инвентарь')}
            <div style="font-size: 11px;">
              ${(character.inventory || []).map(item => `
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px; border-bottom: 1px solid rgba(44, 24, 16, 0.03);">
                  <span>${item.name}${item.quantity && item.quantity > 1 ? ` x${item.quantity}` : ''}</span>
                  <span style="opacity: 0.6;">${item.weight} фт.</span>
                </div>
              `).join('')}
            </div>
            ${character.inventoryNotes ? `
              <div style="margin-top: 10px; font-size: 10px; opacity: 0.7; background: rgba(44, 24, 16, 0.03); padding: 5px;">
                ${character.inventoryNotes}
              </div>
            ` : ''}
          </div>

          <div class="section-block">
            ${sectionTitle('Личность и История')}
            ${character.backstory ? `
              <div style="margin-bottom: 15px;">
                <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; margin-bottom: 3px;">Предыстория</div>
                <div style="font-size: 10px; line-height: 1.3;">${character.backstory}</div>
              </div>
            ` : ''}
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              ${character.personalityTraits ? `<div><div style="font-size: 9px; font-weight: 700;">ЧЕРТЫ</div><div style="font-size: 10px;">${character.personalityTraits}</div></div>` : ''}
              ${character.ideals ? `<div><div style="font-size: 9px; font-weight: 700;">ИДЕАЛЫ</div><div style="font-size: 10px;">${character.ideals}</div></div>` : ''}
              ${character.bonds ? `<div><div style="font-size: 9px; font-weight: 700;">ПРИВЯЗАННОСТИ</div><div style="font-size: 10px;">${character.bonds}</div></div>` : ''}
              ${character.flaws ? `<div><div style="font-size: 9px; font-weight: 700;">СЛАБОСТИ</div><div style="font-size: 10px;">${character.flaws}</div></div>` : ''}
            </div>
            ${character.appearance ? `
              <div style="margin-top: 10px; border-top: 1px solid rgba(44, 24, 16, 0.1); padding-top: 5px;">
                <div style="font-size: 9px; font-weight: 700;">ВНЕШНОСТЬ</div>
                <div style="font-size: 10px;">${character.appearance}</div>
              </div>
            ` : ''}
          </div>

          ${(character.resistances && character.resistances.length > 0) || (character.conditions && character.conditions.length > 0) ? `
            <div class="section-block">
              ${sectionTitle('Состояния и Сопротивления')}
              ${character.resistances && character.resistances.length > 0 ? `
                <div style="margin-bottom: 10px;">
                  <div style="font-size: 9px; font-weight: 700;">СОПРОТИВЛЕНИЯ</div>
                  <div style="font-size: 10px;">${character.resistances.map(r => `${r.type} (${r.level})`).join(', ')}</div>
                </div>
              ` : ''}
              ${character.conditions && character.conditions.length > 0 ? `
                <div>
                  <div style="font-size: 9px; font-weight: 700;">СОСТОЯНИЯ</div>
                  <div style="font-size: 10px;">${character.conditions.map(id => CONDITIONS.find(c => c.id === id)?.name || id).join(', ')}</div>
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>
      </div>
      
      <div style="position: absolute; bottom: 30px; left: 0; right: 0; text-align: center; border-top: 1px solid rgba(44, 24, 16, 0.1); padding-top: 10px; margin: 0 40px;">
        <div style="font-family: 'MedievalSharp', cursive; font-size: 10px; opacity: 0.3;">Into The Dark • 2025 • Да пребудет с вами свет</div>
      </div>
    </div>
  `;
  
  document.body.appendChild(container);
  
  try {
    const images = container.getElementsByTagName('img');
    await Promise.all(Array.from(images).map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
    }));

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    const pages = container.querySelectorAll('.pdf-page');
    
    await new Promise(resolve => setTimeout(resolve, 500));

    const pageHeightMM = 297;
    const pageWidthMM = 210;

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i] as HTMLElement;
      
      const canvas = await html2canvas(page, {
        scale: 2,
        backgroundColor: '#f4e4bc',
        logging: true,
        useCORS: true,
        allowTaint: false,
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const imgWidth = pageWidthMM;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      while (heightLeft > 0) {
        if (i > 0 || position < 0) pdf.addPage();
        
        pdf.setFillColor(244, 228, 188);
        pdf.rect(0, 0, pageWidthMM, pageHeightMM, 'F');
        
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        
        heightLeft -= pageHeightMM;
        position -= pageHeightMM;
      }
    }

    pdf.save(`${character.name || 'character'}.pdf`);
  } catch (error) {
    console.error('PDF Export Error:', error);
    alert('Ошибка при экспорте PDF. Проверьте консоль для деталей.');
  } finally {
    if (container.parentNode) document.body.removeChild(container);
    if (loadingToast.parentNode) document.body.removeChild(loadingToast);
  }
};
