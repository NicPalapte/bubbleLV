// Kleine GAEB-DA-XML-Dateien für Tests, die eine bestimmte Größe oder Form
// brauchen (viele Positionen, tiefe Verschachtelung), ohne eine große Fixture
// ins Repo zu legen.

const KOPF =
  '<?xml version="1.0" encoding="utf-8"?>' +
  '<GAEB xmlns="http://www.gaeb.de/GAEB_DA_XML/DA83/3.3">' +
  '<GAEBInfo><Version>3.3</Version></GAEBInfo>' +
  '<Award><DP>83</DP><BoQ><BoQBody>';
const FUSS = '</BoQBody></BoQ></Award></GAEB>';

function position(nummer: number): string {
  const oz = String(nummer * 10).padStart(4, '0');
  return (
    `<Item RNoPart="${oz}"><Qty>1.000</Qty><QU>m3</QU>` +
    '<Description><CompleteText><OutlineText><OutlTxt><TextOutlTxt>' +
    `<span>Position ${nummer}</span>` +
    '</TextOutlTxt></OutlTxt></OutlineText></CompleteText></Description></Item>'
  );
}

/** Gültiges LV mit genau `anzahl` Positionen in einem Abschnitt. */
export function gaebMitPositionen(anzahl: number): string {
  let items = '';
  for (let i = 1; i <= anzahl; i++) items += position(i);
  return (
    `${KOPF}<BoQCtgy RNoPart="01"><BoQBody><Itemlist>${items}</Itemlist></BoQBody></BoQCtgy>` + FUSS
  );
}

/** LV, dessen Abschnitte `tiefe` Ebenen tief ineinander stecken. */
export function gaebVerschachtelt(tiefe: number): string {
  const auf = '<BoQCtgy RNoPart="01"><BoQBody>';
  const zu = '</BoQBody></BoQCtgy>';
  return `${KOPF}${auf.repeat(tiefe)}<Itemlist>${position(1)}</Itemlist>${zu.repeat(tiefe)}${FUSS}`;
}
