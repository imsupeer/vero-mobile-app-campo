/**
 * O HTML do mapa de satélite — o mesmo desenho do VERO web.
 *
 * Leaflet + imagens de satélite do Esri World Imagery (a mesma fonte do site) e
 * os polígonos reais das válvulas, coloridos pelo estado (situação ou pressão
 * MIP/MID). Vai dentro de um WebView no aparelho e de um <iframe> na web.
 *
 * Precisa de internet para as tiles — por isso é o modo "conectado". Sem rede,
 * a tela cai para o desenho offline (`MapaOffline`). Nada de dado pessoal entra
 * aqui: só código da válvula, cor e a geometria (polígono), que já é pública no
 * cadastro.
 */

export type FeicaoMapa = {
  /** Id do setor/válvula — volta no clique para o app abrir a ficha. */
  id: string;
  nome: string;
  cor: string;
  /** Geometria GeoJSON (Polygon/MultiPolygon) já parseada, ou null. */
  geojson: unknown;
};

export type ItemLegendaMapa = { cor: string; texto: string };

/** Serializa para dentro de <script> sem permitir quebrar a tag. */
function seguro(valor: unknown): string {
  return JSON.stringify(valor).replace(/</g, '\\u003c');
}

export function htmlDoMapa(feicoes: FeicaoMapa[], legenda: ItemLegendaMapa[]): string {
  const comGeo = feicoes.filter((f) => f.geojson != null);
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #mapa { margin: 0; height: 100%; width: 100%; background: #08262A; }
  .rotulo { color: #fff; font: 700 13px system-ui, sans-serif; text-shadow: 0 1px 3px rgba(0,0,0,.7); }
  .leaflet-tooltip.rotulo { background: transparent; border: 0; box-shadow: none; }
  .legenda { font: 12px system-ui, sans-serif; color: #17232B; background: rgba(255,255,255,.92);
             padding: 8px 10px; border-radius: 8px; box-shadow: 0 1px 6px rgba(0,0,0,.25); line-height: 1.5; }
  .legenda .li { display: flex; align-items: center; gap: 6px; }
  .legenda .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
  .semrede { position: absolute; inset: 0; display: none; align-items: center; justify-content: center;
             text-align: center; color: #C6B8A4; font: 14px system-ui; background: #08262A; padding: 24px; z-index: 500; }
</style>
</head>
<body>
<div id="mapa"></div>
<div id="semrede" class="semrede">Não foi possível carregar o mapa de satélite.<br/>Os pontos das válvulas continuam disponíveis.</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function () {
  var FEICOES = ${seguro(comGeo)};
  var LEGENDA = ${seguro(legenda)};
  try {
    var map = L.map('mapa', { attributionControl: true, zoomControl: true });
    var tiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Imagens © Esri World Imagery'
    });
    var falhou = 0;
    tiles.on('tileerror', function () { falhou++; if (falhou > 3) document.getElementById('semrede').style.display = 'flex'; });
    tiles.addTo(map);

    function enviarClique(id) {
      try {
        var msg = JSON.stringify({ tipo: 'talhao', id: String(id) });
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(msg);
        } else if (window.parent) {
          window.parent.postMessage({ tipo: 'talhao', id: String(id) }, '*');
        }
      } catch (e) {}
    }

    var camada = L.geoJSON(
      FEICOES.map(function (f) { return { type: 'Feature', properties: { id: f.id, nome: f.nome, cor: f.cor }, geometry: f.geojson }; }),
      {
        pointToLayer: function (feat, latlng) {
          var c = feat.properties.cor || '#0E7E72';
          return L.circleMarker(latlng, { radius: 8, color: '#FFFFFF', weight: 2, fillColor: c, fillOpacity: 0.95 });
        },
        style: function (feat) {
          var c = feat.properties.cor || '#0E7E72';
          return { color: c, weight: 2, opacity: 1, fillColor: c, fillOpacity: 0.45 };
        },
        onEachFeature: function (feat, layer) {
          if (feat.properties.nome) {
            layer.bindTooltip(String(feat.properties.nome), { permanent: true, direction: 'center', className: 'rotulo' });
          }
          layer.on('click', function () { enviarClique(feat.properties.id); });
          layer.on('mouseover', function () { layer.setStyle({ weight: 3, fillOpacity: 0.6 }); });
          layer.on('mouseout', function () { layer.setStyle({ weight: 2, fillOpacity: 0.45 }); });
        }
      }
    ).addTo(map);

    var b = camada.getBounds();
    if (b.isValid()) { map.fitBounds(b, { padding: [24, 24] }); } else { map.setView([-9.3, -40.5], 12); }

    if (LEGENDA && LEGENDA.length) {
      var ctrl = L.control({ position: 'bottomright' });
      ctrl.onAdd = function () {
        var d = L.DomUtil.create('div', 'legenda');
        d.innerHTML = LEGENDA.map(function (l) {
          return '<div class="li"><span class="dot" style="background:' + l.cor + '"></span>' + l.texto + '</div>';
        }).join('');
        return d;
      };
      ctrl.addTo(map);
    }
  } catch (e) {
    document.getElementById('semrede').style.display = 'flex';
  }
})();
</script>
</body>
</html>`;
}
