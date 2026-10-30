"""Albion Capitals: Cinzel Decorative with a Cyrillic of its own, for Fable's titles.

Cinzel Decorative has no Cyrillic. A Russian letter that has a Latin twin (А В Е К М Н О Р С Т Х)
takes the twin's swash capital; the rest are put together from the face's plain capitals (its lower
case) — mirrored, flipped, joined — with bars cut to its own stroke. The Latin stays as it is.

The Open Font License reserves the name 'Cinzel', so the modified face goes by another name; its
licence is copied next to it.

    python scripts/albion-capitals.py   (from apps/web; needs fonttools)
"""

from pathlib import Path

from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.reverseContourPen import ReverseContourPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / 'node_modules/@fontsource/cinzel-decorative/files'
LICENCE = ROOT / 'node_modules/@fontsource/cinzel-decorative/LICENSE'
OUT = Path(__file__).resolve().parents[1] / 'src/assets/fonts'
FAMILY = 'Albion Capitals'


class Builder:
    def __init__(self, font: TTFont, extended: TTFont):
        self.font = font
        self.glyf = font['glyf']
        self.hmtx = font['hmtx']
        self.glyphs = font.getGlyphSet()
        self.breve = self._breve(extended)
        # The face's own strokes: a capital's stem and the hyphen's height.
        self.stem = self._stem('i')
        self.hair = self._bounds('hyphen')[3] - self._bounds('hyphen')[1]
        self.top = self._bounds('i')[3]

    def _bounds(self, name):
        glyph = self.glyf[name]
        glyph.recalcBounds(self.glyf)
        return glyph.xMin, glyph.yMin, glyph.xMax, glyph.yMax

    def _stem(self, name):
        """The stem's width, from the points of its sides at half its height."""
        pen = RecordingPen()
        self.glyphs[name].draw(pen)
        mid = self._bounds(name)[3] / 2
        xs = sorted(x for _, args in pen.value for (x, y) in args if abs(y - mid) < mid * 0.6)
        return xs[-1] - xs[0] if len(xs) > 1 else 120

    def _breve(self, extended):
        """The breve, lifted off ă: the contours of ă standing wholly above its capital."""
        whole = RecordingPen()
        extended.getGlyphSet()['abreve'].draw(whole)
        ops, contour = [], []
        for op in whole.value:
            contour.append(op)
            if op[0] in ('closePath', 'endPath'):
                if min(y for _, args in contour for (_, y) in args) > self._bounds('a')[3]:
                    ops += contour
                contour = []
        return ops

    # A letter is a list of parts: (glyph name or recorded ops, a 2×3 transform).
    def draw(self, parts, advance):
        pen = TTGlyphPen(None)
        for source, (a, b, c, d, e, f) in parts:
            mirrored = a * d - b * c < 0
            target = TransformPen(ReverseContourPen(pen) if mirrored else pen, (a, b, c, d, e, f))
            if isinstance(source, str):
                self.glyphs[source].draw(target)
            else:
                rec = RecordingPen()
                rec.value = source
                rec.replay(target)
        return pen.glyph(), advance

    def width(self, name):
        return self.hmtx[name][0]

    def rect(self, x0, y0, x1, y1):
        return [('moveTo', ((x0, y0),)), ('lineTo', ((x0, y1),)), ('lineTo', ((x1, y1),)), ('lineTo', ((x1, y0),)), ('closePath', ())]


def letters(b: Builder, case: str):
    """Russian letters of one case; capitals take the swash twins, lower case the plain capitals."""
    swash = (lambda n: n.upper()) if case == 'upper' else (lambda n: n)
    plain = lambda n: n  # the lower case is the face's plain capitals
    I = (1, 0, 0, 1, 0, 0)
    w = b.width
    top, stem, hair = b.top, b.stem, b.hair

    def at(x, y=0):
        return (1, 0, 0, 1, x, y)

    def mirror(name):
        return (-1, 0, 0, 1, w(name), 0)

    def flip(name, height=top):
        return (1, 0, 0, -1, 0, height)

    out = {}
    twins = {'А': 'a', 'В': 'b', 'Е': 'e', 'К': 'k', 'М': 'm', 'Н': 'h', 'О': 'o', 'Р': 'p', 'С': 'c', 'Т': 't', 'Х': 'x', 'У': 'y'}
    for ru, lat in twins.items():
        out[ru] = ([(swash(lat), I)], w(swash(lat)))
    out['Ё'] = ([('Edieresis' if case == 'upper' else 'edieresis', I)], w(swash('e')))

    i, l, v, p = plain('i'), plain('l'), plain('v'), plain('p')
    wi = w(i)
    # И and Я are N and R turned round; Й wears the breve.
    n = plain('n')
    out['И'] = ([(n, mirror(n))], w(n))
    out['Й'] = ([(n, mirror(n)), (b.breve, at((w(n) - w('a')) / 2))], w(n))
    r = swash('r')
    out['Я'] = ([(r, mirror(r))], w(r) + (60 if case == 'upper' else 0))
    # Г is L stood on its head; Л is V; Ь is P upside down.
    out['Г'] = ([(l, flip(l))], w(l) - 40)
    out['Л'] = ([(v, flip(v))], w(v))
    out['Ь'] = ([(p, flip(p))], w(p))
    out['Б'] = ([(p, flip(p)), (l, flip(l))], max(w(p), w(l)))
    # Ъ: the hard sign's arm reaches back left of the soft sign.
    arm = 170
    out['Ъ'] = ([(b.rect(0, top - hair, arm + stem, top), I), (p, (1, 0, 0, -1, arm, top))], w(p) + arm)
    out['Ы'] = ([(p, flip(p)), (i, at(w(p) - 30))], w(p) - 30 + wi)
    # П: two stems under a bar as heavy as the hyphen, as wide as H.
    span = w(plain('h')) - 40
    out['П'] = ([(i, at(0)), (i, at(span - wi)), (b.rect(60, top - hair, span - 60, top), I)], span)
    # Ж is K and its mirror sharing one stem.
    k = plain('k')
    out['Ж'] = ([(k, at(w(k) - 2 * 30 - stem - 0)), (k, (-1, 0, 0, 1, w(k), 0))], 2 * w(k) - 2 * 30 - stem)
    # Ф: a narrowed O through a taller stem.
    o = plain('o')
    out['Ф'] = ([(o, (0.86, 0, 0, 0.82, 0, 64)), (i, (1, 0, 0, 1.12, (w(o) * 0.86 - wi) / 2, -40))], w(o) * 0.86)
    # Э is C turned round with a bar; Ю a stem, a bar and O.
    c = plain('c')
    out['Э'] = ([(c, mirror(c)), (b.rect(w(c) * 0.32, top * 0.47, w(c) - 60, top * 0.47 + hair), I)], w(c))
    out['Ю'] = ([(i, I), (b.rect(wi - 60, top * 0.46, wi + 40, top * 0.46 + hair), I), (o, at(wi - 10))], wi - 10 + w(o))
    # З is the figure three set on the line.
    three = plain('three')
    tb = b._bounds(three)
    s = (top + 14) / (tb[3] - tb[1])
    out['З'] = ([(three, (s, 0, 0, s, 0, -tb[1] * s))], w(three) * s)
    # Ш, Щ, Ц: stems on one bar, a tail below for Щ and Ц.
    gap = wi - 40
    shoe = lambda k: b.rect(30, 0, 30 + gap * (k - 1) + (wi - 60), hair + 10)
    tail = lambda x: b.rect(x - stem, -150, x, 0)
    out['Ш'] = ([(i, at(0)), (i, at(gap)), (i, at(2 * gap)), (shoe(3), I)], 2 * gap + wi)
    out['Щ'] = ([(i, at(0)), (i, at(gap)), (i, at(2 * gap)), (shoe(3), I), (tail(2 * gap + wi - 10), I)], 2 * gap + wi + 20)
    out['Ц'] = ([(i, at(0)), (i, at(gap)), (shoe(2), I), (tail(gap + wi - 10), I)], gap + wi + 20)
    # Ч: a short stem down to a bar, the bar to a full stem.
    half = (1, 0, 0, 0.5, 0, top * 0.5)
    out['Ч'] = ([(i, half), (b.rect(wi / 2, top * 0.42, gap + wi / 2, top * 0.42 + hair), I), (i, at(gap))], gap + wi)
    # Д: Л on a bar with feet.
    out['Д'] = ([(v, (0.9, 0, 0, -1, 40, top)), (b.rect(0, 0, w(v) * 0.9 + 80, hair + 10), I), (tail(stem), I), (tail(w(v) * 0.9 + 80), I)], w(v) * 0.9 + 80)
    return out


def build(weight: int):
    font = TTFont(SOURCE / f'cinzel-decorative-latin-{weight}-normal.woff')
    extended = TTFont(SOURCE / f'cinzel-decorative-latin-ext-{weight}-normal.woff')
    b = Builder(font, extended)
    cmap = {}
    for case in ('upper', 'lower'):
        for ru, (parts, advance) in letters(b, case).items():
            char = ru if case == 'upper' else ru.lower()
            name = f'uni{ord(char):04X}'
            glyph, adv = b.draw(parts, advance)
            glyph.recalcBounds(b.glyf)
            b.glyf[name] = glyph
            b.hmtx[name] = (round(adv), getattr(glyph, 'xMin', 0))
            cmap[ord(char)] = name
    # Setting a glyph adds it to the glyph table's order; the font takes that order.
    order = list(b.glyf.glyphOrder)
    font.setGlyphOrder(order)
    for table in font['cmap'].tables:
        if table.isUnicode():
            table.cmap.update(cmap)
    font['maxp'].numGlyphs = len(order)
    if font['post'].formatType == 2:
        font['post'].extraNames = []
        font['post'].mapping = {}
    style = 'Bold' if weight == 700 else 'Black'
    names = font['name']
    for record in list(names.names):
        if record.nameID in (1, 3, 4, 6, 16, 17):
            names.removeNames(nameID=record.nameID)
    names.setName(FAMILY, 1, 3, 1, 0x409)
    names.setName(style, 2, 3, 1, 0x409)
    names.setName(f'{FAMILY} {style}', 4, 3, 1, 0x409)
    names.setName(f'AlbionCapitals-{style}', 6, 3, 1, 0x409)
    names.setName(f'{FAMILY} {style}; derived from Cinzel Decorative', 3, 3, 1, 0x409)
    font.flavor = 'woff'
    OUT.mkdir(parents=True, exist_ok=True)
    font.save(OUT / f'albion-capitals-{weight}.woff')


if __name__ == '__main__':
    for weight in (700, 900):
        build(weight)
    (OUT / 'albion-capitals-OFL.txt').write_text(LICENCE.read_text(encoding='utf-8'), encoding='utf-8')
    print('built', sorted(p.name for p in OUT.iterdir()))
