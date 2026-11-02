// Story data bundle — allows running directly via file:// on double click
window.STORY_DATA = {
  "title": "Malin Kundang",
  "subtitle": "A webcomic retelling of the West Sumatran legend of the son who forgot his mother.",
  "chapters": [
    {
      "id": "rumah",
      "title": "Rumah"
    }
  ],
  "scenes": [
    {
      "id": "segment-one",
      "chapter": "rumah",
      "height": 3,
      "art": {
        "width": 1920,
        "height": 3198
      },
      "camera": {
        "end": 0.55,
        "lift": 0.2,
        "liftFrom": 0.6,
        "pace": 1,
        "startCenter": 0.6,
        "holdStart": 2,
        "holdEnd": 0.5,
        "spread": 0.7
      },
      "background": "#4b6381",
      "captionStyle": "plain",
      "layers": [
        {
          "src": "img/scenes/segment-one/2.PNG",
          "depth": 0.4,
          "scale": 1.15,
          "pivot": "50% 0%",
          "drift": 1.5
        },
        {
          "src": "img/scenes/segment-one/3.PNG",
          "depth": 0.55,
          "scale": 1.04,
          "pivot": "50% 65%",
          "shake": {
            "x": 0.4,
            "y": 0.25,
            "rot": 0.4,
            "period": 3.6,
            "phase": 0
          }
        },
        {
          "src": "img/scenes/segment-one/4.PNG",
          "alt": "A steamship rides a rough sea under a heavy, clouded sky.",
          "depth": 0.6,
          "pivot": "47% 64%",
          "bob": 6,
          "tilt": 1.2,
          "shake": {
            "x": 0.6,
            "y": 0.4,
            "rot": 0.7,
            "period": 3.6,
            "phase": 0
          },
          "scale": 0.92
        },
        {
          "src": "img/scenes/segment-one/5.PNG",
          "depth": 0.6,
          "scale": 1.05,
          "pivot": "50% 65%",
          "shake": {
            "x": 0.6,
            "y": 0.4,
            "rot": 0.7,
            "period": 3.6,
            "phase": 0
          }
        },
        {
          "src": "img/scenes/segment-one/6.PNG",
          "depth": 0.7,
          "scale": 1.05,
          "pivot": "50% 65%",
          "shake": {
            "x": 0.8,
            "y": 0.5,
            "rot": 0.8,
            "period": 3.6,
            "phase": 0
          }
        },
        {
          "src": "img/scenes/segment-one/7.PNG",
          "depth": 0.8,
          "scale": 1.06,
          "pivot": "50% 65%",
          "shake": {
            "x": 1.0,
            "y": 0.6,
            "rot": 1.0,
            "period": 3.6,
            "phase": 0
          }
        },
        {
          "src": "img/scenes/segment-one/8.PNG",
          "depth": 0.9,
          "scale": 1.06,
          "pivot": "50% 65%",
          "shake": {
            "x": 1.1,
            "y": 0.7,
            "rot": 1.1,
            "period": 3.6,
            "phase": 0
          }
        },
        {
          "src": "img/scenes/segment-one/9.PNG",
          "depth": 1,
          "scale": 1.06,
          "pivot": "50% 65%",
          "shake": {
            "x": 1.2,
            "y": 0.8,
            "rot": 1.2,
            "period": 3.6,
            "phase": 0
          }
        }
      ],
      "captions": [
        {
          "type": "chapter-title",
          "label": "CHAPTER 1 :",
          "title": "RUMAH",
          "at": 0.25,
          "dur": 0.75,
          "pos": "center",
          "phase": "start",
          "enter": "scroll",
          "exit": "scroll"
        },
        {
          "at": 0.1,
          "dur": 0.02,
          "text": "Di tepi Sumatera, ada sebuah kampung kecil yang tidak pernah sunyi dari suara ombak.",
          "phase": "move",
          "enter": "scroll",
          "pos": "bottom-center",
          "exit": "scroll",
          "cueTransition": true
        },
        {
          "at": 0.15,
          "dur": 0.025,
          "text": "Tempat di mana ombak laut datang sebelum matahari.",
          "phase": "move",
          "enter": "scroll",
          "pos": "bottom-center",
          "exit": "scroll",
          "cueTransition": true
        }
      ],
      "audio": null,
      "fx": "none",
      "panels": [
        {
          "type": "image",
          "src": "img/scenes/segment-one/panels/segmen1 01.PNG",
          "tilt3d": true,
          "bubbles": []
        },
        {
          "type": "image",
          "src": "img/scenes/segment-one/panels/segmen1 02.PNG",
          "bubbles": [
            {
              "src": "img/scenes/segment-one/text-bubble/bubble-1-segment1-02-01.PNG",
              "origin": "29.1% 17.4%",
              "dialogs": [
                {
                  "text": "MASUK DULU...\nCUCI MUKA DULU.\nBARU MAKAN.",
                  "top": "4.9%",
                  "left": "10.0%",
                  "width": "13.4%",
                  "height": "33.1%"
                },
                {
                  "text": "IBU MASAK\nAPA?",
                  "top": "2.8%",
                  "left": "36.6%",
                  "width": "10.0%",
                  "height": "20.9%"
                }
              ]
            },
            {
              "src": "img/scenes/segment-one/text-bubble/bubble-2-segment1-02-02.PNG",
              "origin": "78.3% 26.5%",
              "dialogs": [
                {
                  "text": "AROMANYA\nSAMPAI KELUAR\nSANA, BU.",
                  "top": "10.0%",
                  "left": "80.2%",
                  "width": "14.1%",
                  "height": "23.8%"
                },
                {
                  "text": "IYA DONG,\nPERGI KESANA\nNANTI SUPNYA\nKEBURU DINGIN.",
                  "top": "14.5%",
                  "left": "63.4%",
                  "width": "12.1%",
                  "height": "33.1%"
                }
              ]
            }
          ]
        },
        {
          "type": "image",
          "src": "img/scenes/segment-one/panels/segmen1 03.PNG",
          "bubbles": [],
          "narrative": "Ayahnya pergi ketika Malin masih terlalu kecil untuk bertanya. Mande tidak pernah menjelaskan. Dan Malin lama-lama belajar untuk tidak menunggu jawaban."
        },
        {
          "type": "multi",
          "layout": "stagger-right",
          "frames": [
            {
              "src": "img/scenes/segment-one/panels/segmen1 04.PNG",
              "bubbles": [
                {
                  "src": "img/scenes/segment-one/text-bubble/bubble-3-segment1-04-01.PNG",
                  "origin": "44.7% 43.6%",
                  "dialogs": [
                    {
                      "text": "IBU SERING\nSEKALI\nMELAMUN\nLIHAT LAUT.\nSEDANG\nMEMIKIRKAN\nAPA, BU?",
                      "top": "2.7%",
                      "left": "19.8%",
                      "width": "19.6%",
                      "height": "35.7%"
                    },
                    {
                      "text": "LAUT ITU...\nTIDAK\nPERNAH\nSAMA NAK.\nSETIAP HARI\nSELALU ADA\nHAL BARU\nKALAU KAMU\nMAU LIHAT",
                      "top": "5.1%",
                      "left": "51.5%",
                      "width": "21.1%",
                      "height": "44.6%"
                    },
                    {
                      "text": "LALU IBU\nTIDAK\nPENASARAN\nADA APA DI\nSEBERANG\nSANA?",
                      "top": "68.6%",
                      "left": "32.6%",
                      "width": "19.6%",
                      "height": "28.6%"
                    }
                  ]
                }
              ]
            },
            {
              "src": "img/scenes/segment-one/panels/segmen1 05.PNG",
              "bubbles": [
                {
                  "src": "img/scenes/segment-one/text-bubble/bubble-4-segment1-05-01.PNG",
                  "origin": "59.3% 22.9%",
                  "dialogs": [
                    {
                      "text": "PENASARAN\nITU BAIK, LIN.\nASAL JANGAN\nSAMPAI LUPA\nDIMANA KAMU\nBERDIRI\nSEKARANG.",
                      "top": "2.9%",
                      "left": "39.6%",
                      "width": "39.4%",
                      "height": "40.1%"
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          "type": "image",
          "src": "img/scenes/segment-one/panels/segmen1 06.PNG",
          "bubbles": [],
          "narrative": "Malin adalah anak yang aktif dan senang membantu para nelayan di dermaga mengepulkan ikan-ikan. Hanya saja belakangan garis pantai semakin turun hingga nelayan perlu bersusah payah mendapatkan sedikit sekali tangkapan."
        },
        {
          "type": "image",
          "src": "img/scenes/segment-one/panels/segmen1 07.PNG",
          "bubbles": [
            {
              "src": "img/scenes/segment-one/text-bubble/bubble-5-segment1-07-01.PNG",
              "origin": "28.3% 16.1%",
              "dialogs": [
                {
                  "text": "KYAA—",
                  "top": "7.1%",
                  "left": "10.0%",
                  "width": "10.3%",
                  "height": "20.1%"
                },
                {
                  "text": "TARIK TERUS\nMALIN !!!",
                  "top": "2.6%",
                  "left": "34.8%",
                  "width": "13.3%",
                  "height": "25.0%"
                }
              ]
            }
          ]
        },
        {
          "type": "image",
          "src": "img/scenes/segment-one/panels/segmen1 08.PNG"
        },
        {
          "type": "image",
          "src": "img/scenes/segment-one/panels/segmen1 09.PNG",
          "bubbles": [
            {
              "src": "img/scenes/segment-one/text-bubble/bubble-6-segment1-09-01.PNG",
              "origin": "54.7% 33.3%",
              "dialogs": [
                {
                  "text": "TANGANMU KUAT LIN,\nPERSIS SEPERTI\nMENDIANG AYAHMU\nDULU.",
                  "top": "11.7%",
                  "left": "38.6%",
                  "width": "32.2%",
                  "height": "43.3%"
                }
              ]
            },
            {
              "src": "img/scenes/segment-one/text-bubble/bubble-7-segment1-09-02.PNG",
              "origin": "83.4% 17.6%",
              "dialogs": [
                {
                  "text": "BAPAK KENAL\nDEKAT AYAH\nSAYA?",
                  "top": "3.4%",
                  "left": "69.6%",
                  "width": "27.6%",
                  "height": "28.4%"
                }
              ]
            }
          ]
        },
        {
          "type": "image",
          "src": "img/scenes/segment-one/panels/segmen1 10.PNG",
          "bubbles": [
            {
              "src": "img/scenes/segment-one/text-bubble/bubble-8-segment1-10-01.PNG",
              "origin": "63.6% 19.4%",
              "dialogs": [
                {
                  "text": "JELAS KENAL.\nSEMUA NELAYAN\nSINI KENAL.\nDIA CEKATAN DAN\nBANYAK GERAK NAK,\nPERSIS SEPERTI\nKAMU.",
                  "top": "2.8%",
                  "left": "50.4%",
                  "width": "26.4%",
                  "height": "33.3%"
                }
              ]
            }
          ]
        },
        {
          "type": "image",
          "src": "img/scenes/segment-one/panels/segmen1 11.png",
          "bubbles": [
            {
              "src": "img/scenes/segment-one/text-bubble/bubble-9-segment1-11-01.PNG",
              "origin": "17.0% 23.3%",
              "dialogs": [
                {
                  "text": "LALU KENAPA\nAYAH TIDAK\nKEMBALI, PAK?",
                  "top": "3.9%",
                  "left": "2.8%",
                  "width": "28.4%",
                  "height": "38.9%"
                }
              ]
            }
          ]
        },
        {
          "type": "image",
          "src": "img/scenes/segment-one/panels/segmen1 12.png",
          "bubbles": [
            {
              "src": "img/scenes/segment-one/text-bubble/bubble-10-segment1-12-01.PNG",
              "origin": "79.1% 32.8%",
              "dialogs": [
                {
                  "text": "NAK, LAUT ITU\nSELALU TERLIHAT\nLEBIH BAGUS\nDARI DARAT—\nKALAU KAMU BELUM\nPERNAH HANYUT\nDIDALAMNYA.",
                  "top": "3.5%",
                  "left": "60.6%",
                  "width": "37.0%",
                  "height": "58.6%"
                }
              ]
            }
          ]
        },
        {
          "type": "multi",
          "layout": "diptych-3d",
          "staggerFrames": true,
          "frames": [
            {
              "src": "img/scenes/segment-one/panels/segmen1 13.png",
              "tilt": "right-away"
            },
            {
              "src": "img/scenes/segment-one/panels/segmen1 14.png",
              "tilt": "left-away"
            }
          ]
        },
        {
          "type": "image",
          "src": "img/scenes/segment-one/panels/segmen1 15.PNG",
          "bubbles": [
            {
              "src": "img/scenes/segment-one/text-bubble/bubble-11-segment1-15-01.PNG",
              "origin": "38.2% 24.1%",
              "dialogs": [
                {
                  "text": "SEMALAM ADA\nKAPAL LAGI.\nLAMPUNYA MATI\nTAPI DENGUNGNYA\nTERDENGAR SAMPAI\nKE RUMAH SAYA.",
                  "top": "2.7%",
                  "left": "12.6%",
                  "width": "27.6%",
                  "height": "31.5%"
                },
                {
                  "text": "WAH, BULAN INI\nSUDAH TIGA\nKALI.",
                  "top": "19.5%",
                  "left": "40.7%",
                  "width": "18.7%",
                  "height": "20.4%"
                }
              ]
            }
          ]
        },
        {
          "type": "image",
          "src": "img/scenes/segment-one/panels/segmen1 16.PNG",
          "bubbles": [
            {
              "src": "img/scenes/segment-one/text-bubble/bubble-12-segment1-16-01.PNG",
              "origin": "56.8% 31.4%",
              "dialogs": [
                {
                  "text": "SUDAH LAPOR\nKE KEPALA\nDESA?",
                  "top": "2.9%",
                  "left": "53.1%",
                  "width": "14.9%",
                  "height": "30.7%"
                },
                {
                  "text": "SUDAH, TAPI\nKATANYA URUSAN\nORANG KOTA.\nJANGAN IKUT\nCAMPUR.",
                  "top": "12.5%",
                  "left": "12.7%",
                  "width": "25.3%",
                  "height": "27.4%"
                },
                {
                  "text": "ORANG KECIL\nBISA APA\nPAK?",
                  "top": "39.3%",
                  "left": "75.5%",
                  "width": "18.0%",
                  "height": "20.7%"
                }
              ]
            }
          ]
        },
        {
          "type": "image",
          "src": "img/scenes/segment-one/panels/segmen1 17.PNG",
          "bubbles": [
            {
              "src": "img/scenes/segment-one/text-bubble/bubble-13-segment1-17-01.PNG",
              "origin": "70.5% 35.2%",
              "dialogs": [
                {
                  "text": "IYA, BU. TADI DIA\nCERITA SOAL\nAYAH JUGA.",
                  "top": "4.9%",
                  "left": "28.1%",
                  "width": "19.6%",
                  "height": "24.6%"
                },
                {
                  "text": "TADI KAMU\nKATANYA BANTU\nPAK USMAN YA?",
                  "top": "2.2%",
                  "left": "79.6%",
                  "width": "18.5%",
                  "height": "22.3%"
                },
                {
                  "text": "CERITA APA\nPAK USMAN?",
                  "top": "66.0%",
                  "left": "78.6%",
                  "width": "12.0%",
                  "height": "18.1%"
                }
              ]
            }
          ]
        },
        {
          "type": "image",
          "src": "img/scenes/segment-one/panels/segmen1 18.PNG",
          "bubbles": [
            {
              "src": "img/scenes/segment-one/text-bubble/bubble-14-segment1-18-01.png",
              "origin": "48.4% 42.9%",
              "dialogs": [
                {
                  "text": "KATANYA AYAH\nMIRIP AKU.\nTIDAK BETAH DIAM.",
                  "top": "2.0%",
                  "left": "45.9%",
                  "width": "16.1%",
                  "height": "16.9%"
                },
                {
                  "text": "KAMU MEMANG\nMIRIP AYAHMU DI\nBANYAK HAL, LIN.\nITU BUKAN HAL\nYANG BURUK.\nASAL KAMU INGAT\nSATU HAL YANG\nDIA LUPA, BAHWA\nPERGI DAN PULANG\nITU SATU PAKET...\nBUKAN PILIHAN.",
                  "top": "52.8%",
                  "left": "29.5%",
                  "width": "26.5%",
                  "height": "45.2%"
                }
              ]
            }
          ]
        },
        {
          "type": "image",
          "src": "img/scenes/segment-one/panels/segmen1 19.PNG",
          "bubbles": [
            {
              "src": "img/scenes/segment-one/text-bubble/bubble-15-segment1-19-01.PNG",
              "origin": "54.5% 19.8%",
              "dialogs": [
                {
                  "text": "INGAT IBU YA\nNANTI KALAU\nSUDAH BESAR.",
                  "top": "3.8%",
                  "left": "61.1%",
                  "width": "9.0%",
                  "height": "23.4%"
                },
                {
                  "text": "HEHEHE YA BU,\nSUDAH DONG.\nAKU BUKAN ANAK\nKECIL LAGI",
                  "top": "15.0%",
                  "left": "36.8%",
                  "width": "13.2%",
                  "height": "18.2%"
                }
              ]
            }
          ]
        },
        {
          "type": "image",
          "src": "img/scenes/segment-one/panels/segmen1 20.PNG",
          "bubbles": [],
          "narrative": "Malin sering duduk di sini sampai larut. Bukan karena kesepian. Tapi karena ada sesuatu di balik cakrawala yang selalu terasa seperti sedang memanggilnya."
        },
        {
          "type": "image",
          "src": "img/scenes/segment-one/panels/segmen1 21.PNG",
          "bubbles": [
            {
              "src": "img/scenes/segment-one/text-bubble/bubble-16-segment1-21-01.PNG",
              "origin": "48.8% 52.7%",
              "dialogs": [
                {
                  "text": "NELAYAN KOTA,\nSEMOGA TIDAK\nSEPERTI YANG\nKEMARIN MALAM.",
                  "top": "5.2%",
                  "left": "77.5%",
                  "width": "11.2%",
                  "height": "24.2%"
                },
                {
                  "text": "KATANYA DIA DULU\nLEBIH MISKIN\nDARI KITA LOH",
                  "top": "9.0%",
                  "left": "33.6%",
                  "width": "10.7%",
                  "height": "22.8%"
                },
                {
                  "text": "LALU GIMANA\nDIA BISA\nSEPERTI ITU?",
                  "top": "15.1%",
                  "left": "53.6%",
                  "width": "10.4%",
                  "height": "19.9%"
                },
                {
                  "text": "ITU NAHKODA DARI\nKAMPUNG SEBERANG?\nKATANYA DULU JUGA\nORANG BIASA, DARI\nKAMPUNG NELAYAN.",
                  "top": "47.7%",
                  "left": "20.0%",
                  "width": "14.1%",
                  "height": "30.1%"
                },
                {
                  "text": "YANG BENAR?\nTAPI LIHAT SEKARANG\nPENAMPILANNYA!",
                  "top": "69.5%",
                  "left": "2.8%",
                  "width": "15.8%",
                  "height": "22.6%"
                },
                {
                  "text": "PERGI MERANTAU\nDULU LAH. KERJA DI\nKAPAL ORANG SAMPAI\nBERTAHUN-TAHUN.",
                  "top": "70.2%",
                  "left": "35.1%",
                  "width": "17.5%",
                  "height": "23.6%"
                },
                {
                  "text": "MAU GIMANA LAGI PAK,\nMEREKA SEMUA SUDAH\nPUNYA IZIN KATANYA.\nKITA TIDAK BISA\nBUAT BANYAK.",
                  "top": "66.3%",
                  "left": "71.4%",
                  "width": "15.2%",
                  "height": "28.7%"
                }
              ]
            }
          ]
        },
        {
          "type": "image",
          "src": "img/scenes/segment-one/panels/segmen1 22.PNG"
        },
        {
          "type": "image",
          "src": "img/scenes/segment-one/panels/segmen1 23.PNG",
          "bubbles": [
            {
              "src": "img/scenes/segment-one/text-bubble/bubble-17-segment1-23-01.png",
              "origin": "93.6% 86.8%",
              "dialogs": [
                {
                  "text": "...BERTAHUN-\nTAHUN YA?!",
                  "top": "78.1%",
                  "left": "88.5%",
                  "width": "10.2%",
                  "height": "17.5%"
                }
              ]
            }
          ]
        },
        {
          "type": "image",
          "src": "img/scenes/segment-one/panels/segmen1 24.PNG"
        }
      ]
    }
  ]
};
