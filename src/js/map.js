var map;
var previous_points = [];
var points = [];
var Tsunami_MajorWarning, Tsunami_Warning, Tsunami_Watch, Tsunami_Yoho;
var tsunamiLayer;
var gjmap; //オフライン地図
var gjmapT; //津波用geojson
var sections = [];
window.addEventListener("load", function () {
  this.setTimeout(function () {
    document.getElementById("splash").style.display = "none";
  }, 2000);
});

var psWaveList = [];

window.electronAPI.messageSend((event, request) => {
  if (request.action == "kmoniUpdate") {
    var dataTmp = request.data;
    var dataTmp2 = dataTmp.filter(function (elm) {
      return elm.shindo;
    });

    //リアルタイム震度タブ
    var maxShindo = dataTmp2.reduce((a, b) => (a.shindo > b.shindo ? a : b)).shindo;

    var shindoList = dataTmp2.sort(function (a, b) {
      return b.shindo - a.shindo;
    });
    removeChild(document.getElementById("pointList"));
    for (let a = 0; a < 10; a++) {
      var shindoElm = shindoList[a];
      var newElm = document.createElement("li");
      var shindoColor = shindoConvert(shindoElm.shindo, 2);
      var IntDetail = "";
      if (a == 0) IntDetail = "<div class='intDetail'>" + Math.round(maxShindo * 10) / 10 + "</div>";
      newElm.innerHTML = "<div class='int' style='color:" + shindoColor[1] + ";background:" + shindoColor[0] + "'>" + shindoConvert(shindoElm.shindo, 0) + IntDetail + "</div><div class='Pointname'>" + shindoElm.Region + " " + shindoElm.Name + "</div><div class='PGA'>PGA" + Math.round(shindoElm.pga * 100) / 100 + "</div>";
      document.getElementById("pointList").appendChild(newElm);
    }

    //地図上マーカー
    points.forEach(function (elm, index) {
      elm2 = dataTmp[index];
      if (!elm.marker) return;
      if (elm.Name && elm.Point && elm2.data) {
        var changed = true;

        if (previous_points.length !== 0) {
          var rgb0 = previous_points[index].rgb;
          var rgb1 = elm2.rgb;
          if (rgb0) changed = JSON.stringify(rgb0) !== JSON.stringify(rgb1);
        }

        if (changed) {
          var popup_content = "<h3 style='border-bottom:solid 2px rgb(" + elm2.rgb.join(",") + ")'>" + elm.Name + "</h3><table><tr><td>震度</td><td>" + Math.round(elm2.shindo * 10) / 10 + " </td></tr><tr><td>PGA</td><td>" + Math.round(elm2.pga * 100) / 100 + "</td></tr></table>";

          var kmoniPointMarker = L.divIcon({
            html: "<div class='marker-circle' style='background:rgb(" + elm2.rgb.join(",") + ")'></div><div class='PointPopup'>" + popup_content + "</div>",
            className: "kmoniPointMarker",
            iconSize: 25,
          });

          kmoniPointMarker;

          elm.marker
            .setIcon(kmoniPointMarker)
            .on("popupopen", function (e) {
              L.DomUtil.addClass(e.target._icon, "popupOpen");
            })
            .on("popupclose", function (e) {
              L.DomUtil.removeClass(e.target._icon, "popupOpen");
            });
        }
        elm.marker.setOpacity(1);
      } else {
        elm.marker.setOpacity(0);
      }

      if (index == points.length - 1) previous_points = dataTmp;
    });
  } else if (request.action == "longWaveUpdate") {
    document.getElementById("LWaveWrap").style.display = "block";
    document.getElementById("region_name2").innerText = request.data.avrarea_list.join(" ");
    document.getElementById("maxKaikyu").innerText = request.data.avrrank;
  } else if (request.action == "longWaveClear") {
    document.getElementById("LWaveWrap").style.display = "none";
  } else if (request.action == "EEWAlertUpdate") {
    psWaveCalc();
  } else if (request.action == "tsunamiUpdate") {
    if (gjmapT) {
      gjmapT.setStyle({
        stroke: false,
      });
    }

    Tsunami_MajorWarning = Tsunami_Warning = Tsunami_Watch = Tsunami_Yoho = false;

    if (request.data.cancelled) {
      document.getElementById("tsunamiWrap").style.display = "none";

      document.body.classList.remove("TsunamiMode");
    } else {
      map.addLayer(tsunamiLayer);

      document.getElementById("tsunamiWrap").style.display = "block";

      document.body.classList.add("TsunamiMode");
      var alertNow = false;
      request.data.areas.forEach(function (elm) {
        var tsunamiItem = tsunamiElm.find(function (elm2) {
          return elm2.name == elm.name;
        });

        if (elm.cancelled) {
          if (tsunamiItem) {
            tsunamiItem.item
              .setStyle({
                stroke: false,
                className: "tsunamiElm",
              })
              .bindPopup("<h3></h3>津波予報区:" + tsunamiItem.feature.properties.name);
          }
        } else {
          alertNow = true;
          var gradeJa;
          switch (elm.grade) {
            case "MajorWarning":
              Tsunami_MajorWarning = true;
              gradeJa = "大津波警報";
              break;
            case "Warning":
              Tsunami_Warning = true;
              gradeJa = "津波警報";
              break;
            case "Watch":
              Tsunami_Watch = true;
              gradeJa = "津波注意報";
              break;
            case "Yoho":
              Tsunami_Yoho = true;
              gradeJa = "津波予報";
              break;
            default:
              break;
          }

          if (tsunamiItem && tsunamiItem.item) {
            tsunamiItem.item
              .setStyle({
                stroke: true,
                color: tsunamiColorConv(elm.grade),
                weight: 5,
              })
              .bindPopup("<h3 style='border-bottom:solid 2px " + tsunamiColorConv(elm.grade) + "'>" + gradeJa + " 発令中</h3><br>津波予報区:" + tsunamiItem.feature.properties.name);
          }
        }
      });

      if (request.data.revocation || !alertNow) {
        document.getElementById("tsunamiWrap").style.display = "none";
        document.body.classList.remove("TsunamiMode");
        map.removeLayer(tsunamiLayer);
        Tsunami_MajorWarning = Tsunami_Warning = Tsunami_Watch = false;
        if (request.data.revocation) {
          document.getElementById("tsunamiRevocation").style.display = "block";
        } else {
          document.getElementById("tsunamiCancel").style.display = "block";
        }
      } else {
        document.getElementById("tsunamiRevocation").style.display = "none";
        document.getElementById("tsunamiCancel").style.display = "none";
      }

      document.getElementById("tsunami_MajorWarning").style.display = Tsunami_MajorWarning ? "block" : "none";
      document.getElementById("tsunami_Warning").style.display = Tsunami_Warning ? "block" : "none";
      document.getElementById("tsunami_Watch").style.display = Tsunami_Watch ? "block" : "none";
      document.getElementById("tsunami_Yoho").style.display = Tsunami_Yoho ? "block" : "none";

      if (Tsunami_MajorWarning) {
        document.getElementById("tsunamiTitle").style.borderColor = tsunamiColorConv("MajorWarning");
      } else if (Tsunami_Warning) {
        document.getElementById("tsunamiTitle").style.borderColor = tsunamiColorConv("Warning");
      } else if (Tsunami_Watch) {
        document.getElementById("tsunamiTitle").style.borderColor = tsunamiColorConv("Watch");
      } else if (Tsunami_Yoho) {
        document.getElementById("tsunamiTitle").style.borderColor = tsunamiColorConv("Yoho");
      }
    }
  }
  document.getElementById("splash").style.display = "none";
});

function latitudeConvert(data) {
  if (!isNaN(data)) {
    return Number(data);
  } else if (data.match(/N/)) {
    return Number(data.replace("N", ""));
  } else if (data.match(/S/)) {
    return 0 - Number(data.replace("S", ""));
  } else if (data.match(/E/)) {
    return Number(data.replace("E", ""));
  } else if (data.match(/W/)) {
    return 0 - Number(data.replace("W", ""));
  } else {
    return data;
  }
}
let geojsonMarkerOptions = {
  radius: 8,
  fillColor: "#ff7800",
  color: "#000",
  weight: 1,
  opacity: 1,
  fillOpacity: 0.8,
};
let geojsonMarkerOptions2 = {
  radius: 8,
  fillColor: "#0078ff",
  color: "#000",
  weight: 1,
  opacity: 1,
  fillOpacity: 0.8,
};
var overlayTmp = [];
var epicenterIcon;
var tsunamiElm = [];
var inited = false;
var windowLoaded = false;
var TimeTable_JMA2001;

window.addEventListener("load", function () {
  windowLoaded = true;
});

window.electronAPI.messageSend((event, request) => {
  if (request.action == "setting") {
    init();
  }
  return true;
});

function init() {
  if (inited || !setting || !windowLoaded) return;
  inited = true;
  map = L.map("mapcontainer", {
    maxBounds: [
      [90, 0],
      [-90, 360],
    ],
    zoomAnimation: false,
  });
  //L.control.scale({ imperial: false }).addTo(map);←縮尺
  map.setView([32.99125, 138.46], 4);

  var tile1 = L.tileLayer("https://www.data.jma.go.jp/svd/eqdb/data/shindo/map/{z}/{x}/{y}.png", {
    minZoom: 0,
    minNativeZoom: 0,
    maxNativeZoom: 11,
    maxZoom: 21,
    attribution: 'Map data <a href="https://www.data.jma.go.jp/svd/eqdb/data/shindo/" target="_blank">© 気象庁</a>',
  });

  var tile2 = L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png", {
    minZoom: 0,
    minNativeZoom: 2,
    maxNativeZoom: 18,
    maxZoom: 21,
    attribution: 'Map data <a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">©国土地理院</a>',
  });
  var tile3 = L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg", {
    minZoom: 9,
    minNativeZoom: 9,
    maxNativeZoom: 18,
    maxZoom: 21,
    attribution: 'Map data <a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">©国土地理院</a>',
  });
  var tile4 = L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/blank/{z}/{x}/{y}.png", {
    minZoom: 0,
    minNativeZoom: 5,
    maxNativeZoom: 14,
    maxZoom: 21,
    attribution: 'Map data <a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">©国土地理院</a>',
  });
  var tile5 = L.tileLayer("http://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    minZoom: 0,
    minNativeZoom: 0,
    maxNativeZoom: 19,
    maxZoom: 21,
    attribution: 'Map data <a href="https://www.openstreetmap.org/" target="_blank">©OpenStreetMap contributors</a>',
  });
  var tile6 = L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
    minZoom: 0,
    minNativeZoom: 0,
    maxNativeZoom: 21,
    maxZoom: 21,
    attribution: 'Map data <a href="https://www.google.com/maps" target="_blank">©google</a>',
  });
  var tile7 = L.tileLayer("https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
    minZoom: 0,
    minNativeZoom: 0,
    maxNativeZoom: 21,
    maxZoom: 21,
    attribution: 'Map data <a href="https://www.google.com/maps" target="_blank">©google</a>',
  });
  var tile8 = L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png", {
    minZoom: 0,
    minNativeZoom: 0,
    maxNativeZoom: 18,
    maxZoom: 21,
    attribution: 'Map data <a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">©国土地理院</a>',
  });

  var tile9 = L.tileLayer("https://www.jma.go.jp/tile/gsi/pale2/{z}/{x}/{y}.png", {
    minZoom: 0,
    minNativeZoom: 2,
    maxNativeZoom: 11,
    maxZoom: 21,
    attribution: 'Map data <a href="https://www.jma.go.jp/bosai/map.html#5/28.835/168.548/&elem=int&contents=earthquake_map" target="_blank">©気象庁</a>',
  });

  var overlay1 = L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/hillshademap/{z}/{x}/{y}.png", {
    minZoom: 2,
    maxZoom: 16,
    attribution: 'Map data <a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">©国土地理院</a>',
  });
  var overlay2 = L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/vbmd_colorrel/{z}/{x}/{y}.png", {
    minZoom: 11,
    maxZoom: 18,
    attribution: 'Map data <a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">©国土地理院</a>',
  });
  var overlay3 = L.tileLayer("https://disaportaldata.gsi.go.jp/raster/04_tsunami_newlegend_data/{z}/{x}/{y}.png", {
    minZoom: 7,
    maxZoom: 12,
    attribution: 'Map data <a href="https://disaportal.gsi.go.jp/hazardmap/copyright/opendata.html#tsunami" target="_blank">©国土地理院</a>',
  });
  var overlay4 = L.tileLayer("https://disaportaldata.gsi.go.jp/raster/05_kyukeishakeikaikuiki/{z}/{x}/{y}.png", {
    minZoom: 7,
    maxZoom: 12,
    attribution: 'Map data <a href="https://disaportal.gsi.go.jp/hazardmap/copyright/opendata.html#dosekiryukeikaikuiki" target="_blank">©国土地理院</a>',
  });
  var overlay5 = L.tileLayer("https://disaportaldata.gsi.go.jp/raster/05_jisuberikeikaikuiki/{z}/{x}/{y}.png", {
    minZoom: 7,
    maxZoom: 12,
    attribution: 'Map data <a href="https://disaportal.gsi.go.jp/hazardmap/copyright/opendata.html#jisuberikeikaikuiki" target="_blank">©国土地理院</a>',
  });
  var overlay6 = L.tileLayer("https://www.jma.go.jp/tile/jma/transparent-cities/{z}/{x}/{y}.png", {
    minZoom: 0,
    minNativeZoom: 2,
    maxNativeZoom: 11,
    maxZoom: 21,
    attribution: 'Map data <a href="https://www.jma.go.jp/bosai/map.html#5/28.835/168.548/&elem=int&contents=earthquake_map" target="_blank">©JMA</a>',
  });

  fetch("./Resource/Knet_Points.json")
    .then(function (res) {
      return res.json();
    })
    .then(function (json) {
      points = json;

      points.forEach(function (elm) {
        if (elm.Name && elm.Point) {
          var kmoniPointMarker = L.divIcon({
            html: "<div class='marker-circle' style='background:rgba(128,128,128,0.2)'></div><div class='PointPopup'>読み込み中</div>",
            className: "kmoniPointMarker",
            iconSize: 25,
          });
          elm.marker = L.marker([elm.Location.Latitude, elm.Location.Longitude], {
            icon: kmoniPointMarker,
            pane: "PointsPane",
          })
            .bindPopup("", { className: "hidePopup" })
            .addTo(map);
        }
      });
    });

  fetch("./Resource/basemap.json")
    .then(function (res) {
      return res.json();
    })
    .then(function (json) {
      gjmap = L.geoJSON(json, {
        style: {
          color: "#999",
          fill: true,
          fillColor: "#333",
          fillOpacity: 1,
          weight: 1,
          pane: "jsonMAPPane",
          attribution: 'Map data <a href="https://www.naturalearthdata.com/">©Natural Earth</a> / <a href="https://www.data.jma.go.jp/developer/gis.html" target="_blank">©JMA</a>',
        },
        onEachFeature: function onEachFeature(feature, layer) {
          if (feature.properties && feature.properties.NAME) {
            sections.push({ name: feature.properties.NAME, item: layer });
            layer.bindPopup("<h3>地震情報/細分区域</h3>" + feature.properties.NAME);
          }
        },
      }).addTo(map);

      L.control
        .layers(
          {
            オフライン地図: gjmap,
            気象庁: tile1,
            気象庁2: tile9,
            "地理院 標準地図": tile8,

            "地理院 淡色地図": tile2,
            "地理院 写真": tile3,
            "地理院 白地図": tile4,
            OpenStreetMap: tile5,
            "Google Map": tile6,
            "Google Map 写真": tile7,
          },
          {
            "地理院 陰影起伏図": overlay1,
            "地理院 火山基本図データ": overlay2,
            "地理院 津波浸水想定 ハザードマップ": overlay3,
            "地理院 土砂災害警戒区域（急傾斜地の崩壊） ハザードマップ": overlay4,
            "地理院 土砂災害警戒区域（地すべり） ハザードマップ": overlay5,
            "気象庁　境界線": overlay6,
          },
          {
            position: "topleft",
          }
        )
        .addTo(map);
    });

  tsunamiLayer = L.featureGroup();

  fetch("./Resource/tsunami.json")
    .then(function (res) {
      return res.json();
    })
    .then(function (json) {
      gjmapT = L.geoJSON(json, {
        style: {
          stroke: false,
          fill: false,
          pane: "tsunamiPane",
          className: "tsunamiElm",
          attribution: 'Map data <a href="https://www.data.jma.go.jp/developer/gis.html" target="_blank">©JMA</a>',
        },
        onEachFeature: function onEachFeature(feature, layer) {
          if (feature.properties && feature.properties.name) {
            tsunamiElm.push({
              name: feature.properties.name,
              item: layer,
              feature: feature,
            });

            layer.bindPopup("<h3></h3>津波予報区:" + feature.properties.name);
          }
        },
      });

      tsunamiLayer.addLayer(gjmapT);
      window.electronAPI.messageReturn({
        action: "tsunamiReqest",
      });
    });

  var legend = L.control({ position: "bottomright" });
  legend.onAdd = function (map) {
    var img = L.DomUtil.create("img");
    img.src = "./img/nied_acmap_s_w_scale.gif";
    return img;
  };
  legend.addTo(map);
  var legend = L.control({ position: "bottomright" });
  legend.onAdd = function (map) {
    var img = L.DomUtil.create("img");
    img.src = "https://disaportal.gsi.go.jp/hazardmap/copyright/img/tsunami_newlegend.png";
    return img;
  };
  var legend2 = L.control({ position: "bottomright" });
  legend2.onAdd = function (map) {
    var img = L.DomUtil.create("img");
    img.src = "https://disaportal.gsi.go.jp/hazardmap/copyright/img/dosha_keikai.png";
    return img;
  };
  map.createPane("tsunamiPane").style.zIndex = 201;
  map.createPane("jsonMAPPane").style.zIndex = 210;
  map.createPane("PointsPane").style.zIndex = 220;
  /*
  map.createPane("background");
  var imageUrl = "./img/mapbase.png"; //size 5616 x 3744
  var imageBounds = [
    [90, 0],
    [-90, 360],
  ]; //初期表示範囲

  L.imageOverlay(imageUrl, imageBounds, {
    pane: "background",
  }).addTo(map);*/

  map.on("zoom", function () {
    document.querySelectorAll(".SWave,.PWave").forEach(function (elm) {
      elm.classList.remove("SWaveAnm");
      elm.classList.remove("PWaveAnm");
    });
    setTimeout(function () {
      document.querySelectorAll(".SWave").forEach(function (elm) {
        elm.classList.add("SWaveAnm");
      });
      document.querySelectorAll(".PWave").forEach(function (elm) {
        elm.classList.add("PWaveAnm");
      });
    }, 100);

    var currentZoom = map.getZoom();
    document.getElementById("mapcontainer").classList.remove("zoomLevel_1");
    document.getElementById("mapcontainer").classList.remove("zoomLevel_2");
    document.getElementById("mapcontainer").classList.remove("zoomLevel_3");
    document.getElementById("mapcontainer").classList.remove("zoomLevel_4");

    if (currentZoom < 6) {
      document.getElementById("mapcontainer").classList.add("zoomLevel_1");
    } else if (currentZoom < 8) {
      document.getElementById("mapcontainer").classList.add("zoomLevel_2");
    } else if (currentZoom < 9) {
      document.getElementById("mapcontainer").classList.add("zoomLevel_3");
    } else {
      document.getElementById("mapcontainer").classList.add("zoomLevel_4");
    }
    if (currentZoom > 11) {
      document.getElementById("mapcontainer").classList.add("popup_show");
    } else {
      document.getElementById("mapcontainer").classList.remove("popup_show");
    }
  });

  map.on("overlayadd", function (eventLayer) {
    if (eventLayer.name === "地理院 津波浸水想定 ハザードマップ") {
      legend.addTo(map);
    } else if (eventLayer.name === "地理院 土砂災害警戒区域（地すべり） ハザードマップ" || "地理院 土砂災害警戒区域（急傾斜地の崩壊） ハザードマップ") {
      legend2.addTo(map);
      overlayTmp.push(eventLayer.name);
    }
  });
  map.on("overlayremove", function (eventLayer) {
    if (eventLayer.name === "地理院 津波浸水想定 ハザードマップ") {
      map.removeControl(legend);
    } else if (eventLayer.name === "地理院 土砂災害警戒区域（地すべり） ハザードマップ" || "地理院 土砂災害警戒区域（急傾斜地の崩壊） ハザードマップ") {
      overlayTmp = overlayTmp.filter(function (elm) {
        return elm !== eventLayer.name;
      });
      if (overlayTmp.length == 0) {
        map.removeControl(legend2);
      }
    }
  });

  epicenterIcon = L.icon({
    iconUrl: "../src/img/epicenter.svg",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -20],
  });

  window.electronAPI.messageReturn({
    action: "EEWReqest",
  });

  var currentZoom = map.getZoom();

  if (currentZoom < 6) {
    document.getElementById("mapcontainer").classList.add("zoomLevel_1");
  } else if (currentZoom < 8) {
    document.getElementById("mapcontainer").classList.add("zoomLevel_2");
  } else if (currentZoom < 9) {
    document.getElementById("mapcontainer").classList.add("zoomLevel_3");
  } else {
    document.getElementById("mapcontainer").classList.add("zoomLevel_4");
  }
  if (currentZoom > 11) {
    document.getElementById("mapcontainer").classList.add("popup_show");
  } else {
    document.getElementById("mapcontainer").classList.remove("popup_show");
  }

  var homeIcon = L.icon({
    iconUrl: "img/homePin.svg",
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });

  markerElm = L.marker([setting.home.latitude, setting.home.longitude], { keyboard: false, icon: homeIcon }).addTo(map).bindPopup("自宅");

  fetch("./Resource/TimeTable_JMA2001.json")
    .then(function (res) {
      return res.json();
    })
    .then(function (json) {
      TimeTable_JMA2001 = json;

      psWaveCalc();
      this.setInterval(psWaveCalc, 1000);
    });
}

function psWaveCalc() {
  now_EEW.forEach(function (elm) {
    if (!elm.is_cancel && elm.origin_time && elm.depth && elm.latitude && elm.longitude) {
      var distance = Math.floor((new Date() - Replay - elm.origin_time) / 1000);

      if (elm.depth <= 700 && distance <= 2000 && TimeTable_JMA2001) {
        var TimeTableTmp = TimeTable_JMA2001[elm.depth];
        var PRadius = 0;
        var SRadius = 0;
        distance += 1;
        var TimeElmTmpP;
        var TimeElmTmpS;

        var Pfind = TimeTableTmp.find(function (elm2) {
          return elm2.P == distance;
        });

        if (Pfind) {
          TimeElmTmpP = [Pfind, Pfind];
        } else {
          var result = [Infinity, 0];
          var result2 = [Infinity, 0];
          TimeTableTmp.forEach((a) => {
            var b = Math.abs(a.P - distance);
            if (result[0] > b) {
              result2 = result;
              result = [b, a];
            }
          });
          TimeElmTmpP = [result[1], result2[1]];
        }

        var Sfind = TimeTableTmp.find(function (elm2) {
          return elm2.S == distance;
        });

        TimeTableTmp;
        var SWmin = Math.min.apply(
          null,
          TimeTableTmp.map(function (elm2) {
            return elm2.S;
          })
        );
        if (Sfind) {
          TimeElmTmpS = [Sfind, Sfind];
        } else {
          var loopI = 0;
          var result;
          var result2;
          TimeTableTmp.forEach((a) => {
            var b = Math.abs(a.S - distance);
            if (result[0] >= b || loopI == 0) {
              if (loopI == 0) {
                result2 = [null, TimeTableTmp[1]];
              } else {
                result2 = result;
              }
              result = [b, a];
            }
            loopI++;
          });
          TimeElmTmpS = [result[1], result2[1]];
        }

        PRadius = TimeElmTmpP[0].R + ((TimeElmTmpP[1].R - TimeElmTmpP[0].R) * (distance - TimeElmTmpP[0].P)) / (TimeElmTmpP[1].P - TimeElmTmpP[0].P);

        if (SWmin > distance) {
          var ArriveTime = TimeTableTmp.find(function (elm2) {
            return elm2.R == 0;
          }).S;
          psWaveReDraw(
            elm.report_id,
            elm.latitude,
            elm.longitude,
            PRadius * 1000,
            0,
            true, //S波未到達
            ArriveTime, //発生からの到達時間
            distance //現在の経過時間
          );
        } else {
          SRadius = linear([TimeElmTmpS[0].S, TimeElmTmpS[1].S], [TimeElmTmpS[0].R, TimeElmTmpS[1].R])(distance);
          psWaveReDraw(elm.report_id, elm.latitude, elm.longitude, PRadius * 1000, SRadius * 1000);
        }
      }
    }
  });

  //終わった地震の予報円削除
  psWaveList = psWaveList.filter(function (elm) {
    var stillEEW = now_EEW.find(function (elm2) {
      return elm2.report_id;
    });
    if (!stillEEW || stillEEW.is_cancel) {
      if (elm.PCircleElm) map.removeLayer(elm.PCircleElm);
      if (elm.SCircleElm) map.removeLayer(elm.SCircleElm);
    }
    return stillEEW;
  });
}

function psWaveReDraw(report_id, latitude, longitude, pRadius, sRadius, SnotArrived, SArriveTime, nowDistance) {
  if (!pRadius || (!sRadius && !SnotArrived)) return;
  var EQElm = psWaveList.find(function (elm) {
    return elm.id == report_id;
  });
  var EQElm2 = now_EEW.find(function (elm) {
    return elm.report_id == report_id;
  });

  latitude = latitudeConvert(latitude);
  longitude = latitudeConvert(longitude);

  if (EQElm && EQElm.PCircleElm && EQElm.SCircleElm) {
    //EQElm.markerElm.setLatLng([data.latitude, data.longitude]);

    EQElm.PCircleElm.setRadius(pRadius).setLatLng([latitude, longitude]);
    EQElm.SCircleElm.setRadius(sRadius).setLatLng([latitude, longitude]).setStyle({ stroke: !SnotArrived });

    /*
    var overflow1 = map.getBounds()._northEast.lat < EQElm.PCircleElm.getBounds()._northEast.lat;
    var overflow2 = map.getBounds()._northEast.lng < EQElm.PCircleElm.getBounds()._northEast.lng;
    var overflow3 = map.getBounds()._southWest.lat > EQElm.PCircleElm.getBounds()._southWest.lat;
    var overflow4 = map.getBounds()._southWest.lng > EQElm.PCircleElm.getBounds()._southWest.lng;
    if (overflow1 || overflow2 || overflow3 || overflow4) {
      map.fitBounds(EQElm.PCircleElm.getBounds());
    }*/

    EQElm.data = { latitude: latitude, longitude: longitude, pRadius: pRadius, sRadius: sRadius };
  } else {
    var PCElm = L.circle([latitude, longitude], {
      radius: pRadius,
      color: "#3094ff",
      stroke: true,
      fill: false,
      weight: 2,
      className: "PWave PWaveAnm",
      pane: "overlayPane",
    }).addTo(map);
    var SCElm = L.circle([latitude, longitude], {
      radius: sRadius,
      color: "#ff3e30",
      stroke: !SnotArrived,
      fill: true,
      fillColor: "#F00",
      fillOpacity: 0.15,
      weight: 2,
      className: "SWave SWaveAnm",
      pane: "overlayPane",
    }).addTo(map);

    map.fitBounds(PCElm.getBounds());
    map.setView([latitude, longitude, 10]);

    psWaveList.push({ id: report_id, PCircleElm: PCElm, SCircleElm: SCElm, data: [{ latitude: latitude, longitude: longitude, pRadius: pRadius, sRadius: sRadius }] });
    EQElm = psWaveList[psWaveList.length - 1];
  }

  if (EQElm.SIElm) {
    if (SnotArrived) {
      var SWprogressValue = document.getElementById("SWprogressValue_" + report_id);
      if (SWprogressValue) {
        SWprogressValue.setAttribute("stroke-dashoffset", Number(157 - 157 * ((nowDistance - EQElm.firstDetect) / (SArriveTime - EQElm.firstDetect))));
      } else {
        var SIcon = L.divIcon({
          html: '<svg width="50" height="50"><circle id="SWprogressValue_' + report_id + '" class="SWprogressValue" cx="25" cy="25" r="22.5" fill="none" stroke-width="5px" stroke-linecap="round" stroke-dasharray="157" stroke-dashoffset="' + Number(157 - 157 * ((nowDistance - EQElm.firstDetect) / (SArriveTime - EQElm.firstDetect))) + '" transform="rotate(270 25 25)"/></svg>',
          className: "SWaveProgress",
          iconSize: 50,
        });
        EQElm.SIElm.setIcon(SIcon);
      }
    } else {
      map.removeLayer(EQElm.SIElm);
    }
  } else if (SnotArrived) {
    var SIElm;

    EQElm.firstDetect = nowDistance;
    var SIcon = L.divIcon({
      html: '<svg width="50" height="50"><circle id="SWprogressValue_' + report_id + '" class="SWprogressValue" cx="25" cy="25" r="23.5" fill="none" stroke-width="5px" stroke-linecap="round" stroke-dasharray="157" stroke-dashoffset="' + Number(157 - 157 * ((nowDistance - EQElm.firstDetect) / (SArriveTime - EQElm.firstDetect))) + '"/></path></svg>',
      className: "SWaveProgress",
      iconSize: 50,
    });

    SIElm = L.marker([latitude, longitude], {
      icon: SIcon,
    }).addTo(map);

    EQElm.SIElm = SIElm;
  }

  var EEWPanelElm = document.getElementById("EEW-" + report_id);
  if (EQElm2.distance && EEWPanelElm) {
    EEWPanelElm.querySelector(".PWave_value").setAttribute("stroke-dashoffset", 219.91 - 219.91 * Math.min(pRadius / 1000 / EQElm2.distance, 1));
    EEWPanelElm.querySelector(".SWave_value").setAttribute("stroke-dashoffset", 219.91 - 219.91 * Math.min(sRadius / 1000 / EQElm2.distance, 1));
  }
}

function tsunamiColorConv(str) {
  switch (str) {
    case "MajorWarning":
      return "rgb(200,0,255)";
      break;
    case "Warning":
      return "rgb(255,40,0)";
      break;
    case "Watch":
      return "rgb(250,245,0)";
      break;
    case "Yoho":
      return "rgb(66, 158, 255)";
      break;
    default:
      return "#FFF";
      break;
  }
}

const linear = (x, y) => {
  return (x0) => {
    const index = x.reduce((pre, current, i) => (current <= x0 ? i : pre), 0); //数値が何番目の配列の間かを探す
    const i = index === x.length - 1 ? x.length - 2 : index; //配列の最後の値より大きい場合は、外挿のために、最後から2番目をindexにする

    return ((y[i + 1] - y[i]) / (x[i + 1] - x[i])) * (x0 - x[i]) + y[i]; //線形補間の関数を返す
  };
};
