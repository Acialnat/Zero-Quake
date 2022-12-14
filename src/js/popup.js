var now_EEW = [];
var EEWDetectionTimeout;
var Replay;
var ICT_JST = 0;
var setting;
var AreaForecastLocalE;
var prepareing = true;
window.electronAPI.messageSend((event, request) => {
  if (request.action == "EEWAlertUpdate") {
    EEWAlertUpdate(request.data);
    console.log("c", request.data);
  } else if (request.action == "kmoniTimeUpdate") {
    kmoniTimeUpdate(request.Updatetime, request.LocalTime, request.type, request.condition, request.vendor);
  } else if (request.action == "kmoniUpdate") {
    kmoniTimeUpdate(request.Updatetime, request.LocalTime, "kmoniImg", "success");
  } else if (request.action == "MSSelect") {
    document.getElementById(request.str).selected = true;

    /*} else if (request.action == "EEW_Detection") {
    document.getElementById("EEWDetection").style.display = "block";
    clearTimeout(EEWDetectionTimeout);
    EEWDetectionTimeout = setTimeout(function () {
      document.getElementById("EEWDetection").style.display = "none";
    }, 300000);*/
  } else if (request.action == "PSWaveUpdate") {
    epiCenterUpdate(request.data.report_id, request.data.latitude, request.data.longitude);
  } else if (request.action == "PSWaveClear") {
    epiCenterClear(request.data);
  } else if (request.action == "setting") {
    setting = request.data;
  } else if (request.action == "Replay") {
    Replay = request.data;
  } else if (request.action == "EQInfo") {
    eqInfoDraw(request.data, request.source);
  } else if (request.action == "notification_Update") {
    Show_notification(request.data);
  }
  return true;
});
window.addEventListener("load", function () {
  fetch("http://www.kmoni.bosai.go.jp/webservice/maintenance/message.json")
    .then(function (res) {
      return res.json();
    })
    .then(function (json) {
      document.getElementById("kmoni_Message").innerHTML = json.message;
    });
  fetch("./Resource/AreaForecastLocalE.json")
    .then(function (res) {
      return res.json();
    })
    .then(function (json) {
      AreaForecastLocalE = json;
      prepareing = false;
      window.electronAPI.messageReturn({
        action: "EEWReqest",
      });
    });
  setInterval(function () {
    document.getElementById("PC_TIME").innerText = dateEncode(3, new Date());
  }, 200);
});

window.addEventListener("online", (e) => {
  document.getElementById("offline").close();
  document.getElementById("offline2").style.display = "none";
});

window.addEventListener("offline", (e) => {
  document.getElementById("offline").showModal();
  document.getElementById("offline2").style.display = "block";
});
window.addEventListener("load", (e) => {
  if (!navigator.onLine) {
    document.getElementById("offline").showModal();
    document.getElementById("offline2").style.display = "block";
  }
});

var template = document.getElementById("EEWTemplate");
var epiCenter = [];

function EEWAlertUpdate(data) {
  console.log("b", data);
  if (prepareing) return;
  data.forEach((elm) => {
    var same = now_EEW.find(function (elm2) {
      return elm.report_id == elm2.report_id && elm.report_num == elm2.report_num;
    });
    var sameEQ = now_EEW.find(function (elm2) {
      return elm.report_id == elm2.report_id;
    });

    if (!sameEQ) {
      //??????????????????????????????
      var clone = template.content.cloneNode(true);

      alertflgTmp = "(" + elm.alertflg + ")";
      if (!elm.alertflg) alertflgTmp = "";
      clone.querySelector(".alertflg").innerText = alertflgTmp;

      if (elm.alertflg == "??????") {
        clone.querySelector(".EEWWrap").classList.add("keihou");
      } else if (elm.alertflg == "??????") {
        clone.querySelector(".EEWWrap").classList.add("yohou");
      }

      clone.querySelector(".report_num").innerText = elm.report_num;

      clone.querySelector(".calcintensity").innerText = elm.calcintensity ? elm.calcintensity : "?";
      clone.querySelector(".calcintensity").style.background = shindoConvert(elm.calcintensity, 2)[0];
      clone.querySelector(".calcintensity").style.color = shindoConvert(elm.calcintensity, 2)[1];

      clone.querySelector(".is_final").style.display = elm.is_final ? "inline" : "none";
      clone.querySelector(".canceled").style.display = elm.is_cancel ? "flex" : "none";
      clone.querySelector(".region_name").innerText = elm.region_name ? elm.region_name : "??????????????????";
      clone.querySelector(".origin_time").innerText = dateEncode(3, elm.origin_time);
      clone.querySelector(".magunitude").innerText = elm.magunitude ? elm.magunitude : "??????";
      clone.querySelector(".depth").innerText = elm.depth ? elm.depth : "??????";
      clone.querySelector(".traning").style.display = elm.is_training ? "block" : "none";

      if (elm.distance) {
        clone.querySelector(".distance").textContent = Math.round(elm.distance) + "km";
      }

      clone.querySelector(".EEWWrap").setAttribute("id", "EEW-" + elm.report_id);

      document.getElementById("EEW-Panel").appendChild(clone);
      document.getElementById("sokuho-Panel").scroll(0, 0);
    } else {
      //??????????????????????????????????????????????????????
      if (!same) {
        //??????????????????????????????
      }
      var EQMenu = document.getElementById("EEW-" + elm.report_id);

      alertflgTmp = "(" + elm.alertflg + ")";
      if (!elm.alertflg) alertflgTmp = "";
      EQMenu.querySelector(".alertflg").innerText = alertflgTmp;

      EQMenu.querySelector(".report_num").innerText = elm.report_num;

      if (elm.alertflg == "??????") {
        EQMenu.classList.add("keihou");
        EQMenu.classList.remove("yohou");
      } else if (elm.alertflg == "??????") {
        EQMenu.classList.add("yohou");
        EQMenu.classList.remove("keihou");
      }

      EQMenu.querySelector(".calcintensity").innerText = elm.calcintensity ? elm.calcintensity : "?";
      EQMenu.querySelector(".calcintensity").style.background = shindoConvert(elm.calcintensity, 2)[0];
      EQMenu.querySelector(".calcintensity").style.color = shindoConvert(elm.calcintensity, 2)[1];

      EQMenu.querySelector(".is_final").style.display = elm.is_final ? "inline" : "none";
      EQMenu.querySelector(".canceled").style.display = elm.is_cancel ? "flex" : "none";
      EQMenu.querySelector(".region_name").innerText = elm.region_name ? elm.region_name : "??????????????????";
      EQMenu.querySelector(".origin_time").innerText = dateEncode(3, elm.origin_time);
      EQMenu.querySelector(".magunitude").innerText = elm.magunitude ? elm.magunitude : "??????";
      EQMenu.querySelector(".depth").innerText = elm.depth ? elm.depth : "??????";

      if (elm.distance) {
        EQMenu.querySelector(".distance").innerText = Math.round(elm.distance) + "km";
      }
    }
    /*
    if (elm.intensityAreas) {
      var intAreaTmp = [];
      if (elm.intensityAreas["0"]) {
        elm.intensityAreas["0"].forEach(function (elm2) {
          intAreaTmp.push({ int: "0", areaCode: elm2 });
        });
      }
      if (elm.intensityAreas["1"]) {
        elm.intensityAreas["1"].forEach(function (elm2) {
          intAreaTmp.push({ int: "1", areaCode: elm2 });
        });
      }
      if (elm.intensityAreas["2"]) {
        elm.intensityAreas["2"].forEach(function (elm2) {
          intAreaTmp.push({ int: "2", areaCode: elm2 });
        });
      }
      if (elm.intensityAreas["3"]) {
        elm.intensityAreas["3"].forEach(function (elm2) {
          intAreaTmp.push({ int: "3", areaCode: elm2 });
        });
      }
      if (elm.intensityAreas["4"]) {
        elm.intensityAreas["4"].forEach(function (elm2) {
          intAreaTmp.push({ int: "4", areaCode: elm2 });
        });
      }
      if (elm.intensityAreas["5-"]) {
        elm.intensityAreas["5-"].forEach(function (elm2) {
          intAreaTmp.push({ int: "5-", areaCode: elm2 });
        });
      }
      if (elm.intensityAreas["5+"]) {
        elm.intensityAreas["5+"].forEach(function (elm2) {
          intAreaTmp.push({ int: "5+", areaCode: elm2 });
        });
      }
      if (elm.intensityAreas["6-"]) {
        elm.intensityAreas["6-"].forEach(function (elm2) {
          intAreaTmp.push({ int: "6-", areaCode: elm2 });
        });
      }
      if (elm.intensityAreas["6+"]) {
        elm.intensityAreas["6+"].forEach(function (elm2) {
          intAreaTmp.push({ int: "6+", areaCode: elm2 });
        });
      }
      if (elm.intensityAreas["7"]) {
        elm.intensityAreas["7"].forEach(function (elm2) {
          intAreaTmp.push({ int: "7", areaCode: elm2 });
        });
      }
      if (elm.intensityAreas["?"]) {
        elm.intensityAreas["??????"].forEach(function (elm2) {
          intAreaTmp.push({ int: "?", areaCode: elm2 });
        });
      }

      if (sections.length !== 0) {
        intAreaTmp.forEach(function (elm2) {
          var sectTmp = sections.find(function (elm3) {
            return elm3.name == AreaForecastLocalE[elm2.areaCode].name;
          });
          if (sectTmp && sectTmp.item) sectTmp.item.setStyle({ fillColor: shindoConvert(elm2.int, 2)[0] });
        });
      }
    }
*/
    epiCenterUpdate(elm.report_id, elm.latitude, elm.longitude);

    now_EEW = now_EEW.filter(function (elm2) {
      return elm2.report_id !== elm.report_id;
    });
    now_EEW.push(elm);
  });
  now_EEW = now_EEW.filter(function (elm) {
    var stillEQ = data.find(function (elm2) {
      return elm.report_id == elm2.report_id;
    });
    //??????????????????
    if (!stillEQ) {
      console.log("a", data);
      document.getElementById("EEW-" + elm.report_id).remove();
      epiCenterClear(elm.report_id);
    } else if (elm.is_cancel) {
      console.log("a2", data);
      epiCenterClear(elm.report_id);
      //setTimeout(function () {
      document.getElementById("EEW-" + elm.report_id).remove();
      // }, 1000);
    }

    return stillEQ;
  });

  if (data.length == 0) {
    document.body.classList.remove("EEWMode");
  } else {
    document.body.classList.add("EEWMode");
  }
}

var latitudeTmp = 0;
var longitudeTmp = 0;
function epiCenterUpdate(eid, latitude, longitude) {
  if (prepareing) return;

  latitude = latitudeConvert(latitude);
  longitude = latitudeConvert(longitude);
  if (latitude !== latitudeTmp || longitude !== longitudeTmp) {
    eid = Number(eid);

    if (map) {
      var epicenterElm = epiCenter.find(function (elm2) {
        return elm2.eid == eid;
      });
      if (epicenterElm && epicenterElm.markerElm) {
        epicenterElm.markerElm.setLatLng([latitude, longitude]);
        epicenterElm.latitude = latitude;
        epicenterElm.longitude = longitude;
      } else {
        var ESMarker = L.marker([latitude, longitude], {
          icon: epicenterIcon,
          pane: "overlayPane",
        }).addTo(map);

        epiCenter.push({ eid: eid, markerElm: ESMarker, latitude: latitude, longitude: longitude });
      }
    }

    var EQElm = psWaveList.find(function (elm) {
      return elm.id == eid;
    });
    if (EQElm) {
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

      if (EQElm.PCircleElm) EQElm.PCircleElm.setLatLng([latitude, longitude]);
      if (EQElm.SCircleElm) EQElm.SCircleElm.setLatLng([latitude, longitude]);
      if (EQElm.SIElm) EQElm.SIElm.setLatLng([latitude, longitude]);
    }
    latitudeTmp = latitude;
    longitudeTmp = longitude;
  }
}
function epiCenterClear(eid) {
  if (prepareing) return;

  eid = Number(eid);
  if (map) {
    var epicenterElm = epiCenter.find(function (elm2) {
      return elm2.eid == eid;
    });
    if (epicenterElm && epicenterElm.markerElm) {
      map.removeLayer(epicenterElm.markerElm);
      epicenterElm.markerElm = null;
    }
  }
}
/*????????????*/
//
//
//
//
//
//
//

var eqInfo = [];

var template2 = document.getElementById("EQListTemplate");
var template2_2 = document.getElementById("EQListTemplate2");
var EQListWrap;
function eqInfoDraw(data, source) {
  var EQTemplate;
  if (source == "jma") {
    EQTemplate = template2;
    EQListWrap = document.getElementById("JMA_EqInfo");
  } else if (source == "usgs") {
    EQTemplate = template2_2;
    EQListWrap = document.getElementById("USGS_EqInfo");
  }
  removeChild(EQListWrap);
  data.forEach(function (elm) {
    var clone = EQTemplate.content.cloneNode(true);

    clone.querySelector(".EQI_epiCenter").innerText = elm.epiCenter ? elm.epiCenter : "???????????????";
    clone.querySelector(".EQI_datetime").innerText = elm.OriginTime ? dateEncode(3, elm.OriginTime) : "??????????????????";
    clone.querySelector(".EQI_magnitude").innerText = "M" + (elm.M ? elm.M : "??????");

    if (source == "jma") {
      var maxITmp = shindoConvert(elm.maxI, 0);
      var shindoColor = shindoConvert(elm.maxI, 2);
      if (!elm.maxI) {
        maxITmp = "?";
        shindoColor = ["auto", "auto"];
      }
      clone.querySelector(".EQI_maxI").innerText = maxITmp;
      clone.querySelector(".EQI_maxI").style.background = shindoColor[0];
      clone.querySelector(".EQI_maxI").style.color = shindoColor[1];
      clone.querySelector(".canceled").style.display = elm.cancel ? "flex" : "none";

      clone.querySelector(".EQDetailButton").addEventListener("click", function () {
        window.open("EQDetail.html?eid=" + elm.eventId + "&detailURL=" + encodeURIComponent(elm.DetailURL.join("[ZQ_URLSEPARATE]")), "???????????? - Zero Quake");
      });
    } else if (source == "usgs") {
      clone.querySelector(".EQDetailButton").addEventListener("click", function () {
        window.open(elm.DetailURL, "???????????? - Zero Quake");
      });
    }
    EQListWrap.appendChild(clone);
  });
}
/*
setInterval(eqInfoUpdate, 10000);
eqInfoUpdate();
*/

//
//
//
//UI

document.getElementById("TsunamiDetail").addEventListener("click", function () {
  window.electronAPI.messageReturn({
    action: "TsunamiWindowOpen",
  });
});

document.getElementById("EQInfoSelect").addEventListener("change", function () {
  document.querySelectorAll(".activeEQInfo").forEach(function (elm) {
    elm.classList.remove("activeEQInfo");
  });
  document.getElementById(this.value).classList.add("activeEQInfo");
});

var updateTimeTmp = 0;
function kmoniTimeUpdate(updateTime, LocalTime, type, condition, vendor) {
  if (prepareing) return;

  /*
  Updatetime: new Date(data.time),
  LocalTime: new Date(),
  type: "P2P_EEW",
*/
  if (Math.floor(updateTimeTmp / 1000) < Math.floor(updateTime / 1000)) {
    updateTimeTmp = updateTime;
    document.getElementById("all_UpdateTime").innerText = dateEncode(3, updateTime);
  }

  if (vendor) {
    document.getElementById("ymoniVendor").innerText = vendor == "YE" ? "East" : "West";
  }
  document.getElementById(type + "_UT").innerText = dateEncode(3, updateTime);
  var iconElm = document.getElementById(type + "_ICN");

  if (condition == "success") {
    iconElm.classList.add("SuccessAnm");
    iconElm.classList.add("Success");
    iconElm.classList.remove("Error");
  } else if (condition == "Error") {
    iconElm.classList.remove("Success");
    iconElm.classList.add("Error");
  } else if (condition == "Disconnect") {
    iconElm.classList.remove("Success");
    iconElm.classList.remove("Error");
  }

  iconElm.addEventListener("animationend", function () {
    this.classList.remove("SuccessAnm");
  });
}
document.getElementById("setting").addEventListener("click", function () {
  window.electronAPI.messageReturn({
    action: "settingWindowOpen",
  });
});

//
//
//
//???????????? map.js??????

var notifications = [];
function Show_notification(data) {
  document.getElementById("notification_Area").classList.remove("no_notification");
  notifications = notifications.concat(data);

  var notifyNum = notifications.length;
  if (notifyNum > 9) notifyNum = "9+";
  document.getElementById("plus_badge").innerText = notifyNum;

  notificationsTmp = notifications.reverse();
  removeChild(document.getElementById("notification_wrap"));
  notificationsTmp.forEach(function (elm) {
    var template = document.getElementById("notificationTemplate");

    var clone = template.content.cloneNode(true);
    clone.querySelector(".notification_title").innerText = elm.title;
    clone.querySelector(".notification_content").innerText = elm.detail;
    clone.querySelector(".notification_time").innerText = dateEncode(3, elm.time);

    var keyColor = "transparent";
    switch (elm.type) {
      case "error":
        keyColor = "rgb(255, 62, 48)";
        break;
      case "warn":
        keyColor = "rgb(231, 239, 77)";
        break;
      case "info":
        keyColor = "rgb(48, 148, 255)";
        break;
      default:
        break;
    }

    clone.querySelector(".notification_item").style.borderColor = keyColor;

    document.getElementById("notification_wrap").appendChild(clone);
  });
}
document.getElementById("notification_more").addEventListener("click", function () {
  document.getElementById("notification_Area").classList.toggle("open");
});

function removeChild(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function dateEncode(type, dateTmp, inputtype) {
  if (inputtype == 1) {
    var str = String(dateTmp);
    const year = Number(str.substring(0, 4)); //2022
    const month = Number(str.substring(4, 6)); //2
    const day = Number(str.substring(6, 8)); //5
    const hour = Number(str.substring(8, 10)); //21
    const min = Number(str.substring(10, 12)); //0
    const sec = Number(str.substring(12, 14)); //0
    dateTmp = new Date(year, month - 1, day, hour, min, sec); //month???0????????????
  } else {
    dateTmp = new Date(dateTmp);
  }
  if (type == 1) {
    //YYYYMMDDHHMMSS
    var YYYY = String(dateTmp.getFullYear());
    var MM = String(dateTmp.getMonth() + 1).padStart(2, "0");
    var DD = String(dateTmp.getDate()).padStart(2, "0");
    var hh = String(dateTmp.getHours()).padStart(2, "0");
    var mm = String(dateTmp.getMinutes()).padStart(2, "0");
    var ss = String(dateTmp.getSeconds()).padStart(2, "0");
    return YYYY + MM + DD + hh + mm + ss;
  } else if (type == 2) {
    //YYYYMMDD
    var YYYY = String(dateTmp.getFullYear());
    var MM = String(dateTmp.getMonth() + 1).padStart(2, "0");
    var DD = String(dateTmp.getDate()).padStart(2, "0");
    return YYYY + MM + DD;
  } else if (type == 3) {
    //YYYY/MM/DD HH:MM:SS
    var YYYY = String(dateTmp.getFullYear());
    var MM = String(dateTmp.getMonth() + 1).padStart(2, "0");
    var DD = String(dateTmp.getDate()).padStart(2, "0");
    var hh = String(dateTmp.getHours()).padStart(2, "0");
    var mm = String(dateTmp.getMinutes()).padStart(2, "0");
    var ss = String(dateTmp.getSeconds()).padStart(2, "0");
    return YYYY + "/" + MM + "/" + DD + " " + hh + ":" + mm + ":" + ss;
  } else if (type == 4) {
    //YYYY/MM/DD HH:MM
    var YYYY = String(dateTmp.getFullYear());
    var MM = String(dateTmp.getMonth() + 1).padStart(2, "0");
    var DD = String(dateTmp.getDate()).padStart(2, "0");
    var hh = String(dateTmp.getHours()).padStart(2, "0");
    var mm = String(dateTmp.getMinutes()).padStart(2, "0");
    return YYYY + "/" + MM + "/" + DD + " " + hh + ":" + mm;
  } else {
    //free
    var YYYY = String(dateTmp.getFullYear());
    var MM = String(dateTmp.getMonth() + 1).padStart(2, "0");
    var DD = String(dateTmp.getDate()).padStart(2, "0");
    var hh = String(dateTmp.getHours()).padStart(2, "0");
    var mm = String(dateTmp.getMinutes()).padStart(2, "0");
    var ss = String(dateTmp.getSeconds()).padStart(2, "0");

    type.replaceAll("YYYY", YYYY);
    type.replaceAll("MM", MM);
    type.replaceAll("DD", DD);
    type.replaceAll("hh", hh);
    type.replaceAll("mm", mm);
    type.replaceAll("ss", ss);

    return type;
  }
}

function shindoConvert(str, responseType) {
  var ShindoTmp;
  if (!str) {
    ShindoTmp = "?";
  } else if (isNaN(str)) {
    ShindoTmp = String(str);
    ShindoTmp = ShindoTmp.replace(/[???-???]/g, function (s) {
      return String.fromCharCode(s.charCodeAt(0) - 0xfee0);
    });
    ShindoTmp = ShindoTmp.replaceAll("???", "+").replaceAll("???", "-").replaceAll("???", "+").replaceAll("???", "-");
    ShindoTmp = ShindoTmp.replace(/\s+/g, "");
    switch (str) {
      case "-1":
      case "??????":
        ShindoTmp = "?";
        break;
      case "1":
      case "10":
        ShindoTmp = "1";
        break;
      case "2":
      case "20":
        ShindoTmp = "2";
        break;
      case "3":
      case "30":
        ShindoTmp = "3";
        break;
      case "4":
      case "40":
        ShindoTmp = "4";
        break;
      case "5-":
      case "45":
        ShindoTmp = "5-";
        break;
      case "5+":
      case "50":
        ShindoTmp = "5+";
        break;
      case "6-":
      case "55":
        ShindoTmp = "6-";
        break;
      case "6+":
      case "60":
        ShindoTmp = "6+";
        break;
      case "7":
      case "70":
        ShindoTmp = "7";
        break;
      case "99":
        ShindoTmp = "7+";
        break;
    }
  } else {
    if (str < 0.5) {
      ShindoTmp = "0";
    } else if (str < 1.5) {
      ShindoTmp = "1";
    } else if (str < 2.5) {
      ShindoTmp = "2";
    } else if (str < 3.5) {
      ShindoTmp = "3";
    } else if (str < 4.5) {
      ShindoTmp = "4";
    } else if (str < 5) {
      ShindoTmp = "5-";
    } else if (str < 5.5) {
      ShindoTmp = "5+";
    } else if (str < 6) {
      ShindoTmp = "6-";
    } else if (str < 6.5) {
      ShindoTmp = "6+";
    } else if (6.5 <= str) {
      ShindoTmp = "7";
    } else if (7.5 <= str) {
      ShindoTmp = "7+";
    } else {
      ShindoTmp = "?";
    }
  }
  if (["?", "0", "1", "2", "3", "4", "5-", "5+", "6-", "6+", "7", "7+"].includes(ShindoTmp)) {
    switch (responseType) {
      case 1:
        var ConvTable = { "?": "??????", 0: "0", 1: "1", 2: "2", 3: "3", 4: "4", "5-": "5???", "5+": "5???", "6-": "6???", "6+": "6???", 7: "7", "7+": "7??????" };
        return ConvTable[ShindoTmp];
        break;
      case 2:
        var ConvTable = {
          "?": ["#D1D1D1", "#444"],
          0: ["#D1D1D1", "#444"],
          1: ["#54C9E3", "#222"],
          2: ["#2B8DFC", "#111"],
          3: ["#32BA37", "#111"],
          4: ["#DBD21F", "#000"],
          "5-": ["#FF8C00", "#FFF"],
          "5+": ["#FF5714", "#FFF"],
          "6-": ["#E60000", "#FFF"],
          "6+": ["#8A0A0A", "#FFF"],
          7: ["#C400DE", "#FFF"],
          "7+": ["#C400DE", "#FFF"],
        };
        return ConvTable[ShindoTmp];
        break;

      case 0:
      default:
        return ShindoTmp;
        break;
    }
  } else {
    return str;
  }
}

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
