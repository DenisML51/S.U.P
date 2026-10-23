import '@fontsource/golos-text/400.css';
import '@fontsource/golos-text/500.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-sc/600.css';
import '@fontsource/forum/400.css';
import '@fontsource/oranienbaum/400.css';
import '@fontsource/ruslan-display/400.css';
import '@fontsource/old-standard-tt/700.css';
import '@fontsource/unbounded/500.css';
import '@fontsource/exo-2/600.css';
import '@fontsource/spectral/500.css';
import '@fontsource/cormorant-unicase/600.css';

const CANDIDATES = [
  ['Cormorant Garamond 600', "'Cormorant Garamond'", 600],
  ['Cormorant SC 600', "'Cormorant SC'", 600],
  ['Forum', "'Forum'", 400],
  ['Oranienbaum', "'Oranienbaum'", 400],
  ['Ruslan Display', "'Ruslan Display'", 400],
  ['Old Standard TT 700', "'Old Standard TT'", 700],
  ['Unbounded 500', "'Unbounded'", 500],
  ['Exo 2 600', "'Exo 2'", 600],
  ['Spectral 500', "'Spectral'", 500],
  ['Cormorant Unicase 600', "'Cormorant Unicase'", 600],
] as const;

export const FontSpecimen = () => (
  <div style={{ background: '#16130f', color: '#e8dcc4', padding: 32, minHeight: '100vh' }}>
    {CANDIDATES.map(([label, family, weight]) => (
      <div key={label} style={{ display: 'flex', gap: 24, alignItems: 'baseline', borderBottom: '1px solid #3a3226', padding: '10px 0' }}>
        <div style={{ width: 200, fontFamily: 'Golos Text', fontSize: 12, opacity: 0.6 }}>{label}</div>
        <div style={{ fontFamily: family, fontWeight: weight, fontSize: 40 }}>Лиара Т’Сони · Хорус 20</div>
        <div style={{ fontFamily: family, fontWeight: weight, fontSize: 18, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Характеристики
        </div>
      </div>
    ))}
    <p style={{ fontFamily: 'Golos Text', fontSize: 15, lineHeight: 1.6, maxWidth: 640, marginTop: 24 }}>
      Golos Text — основной текст. Азари с характерным гребнем, спокойной осанкой и внимательным взглядом
      учёного. Броня Лиары собрана под биотику: минимум лишней массы, максимум контроля поля. 168/290 HP.
    </p>
  </div>
);
