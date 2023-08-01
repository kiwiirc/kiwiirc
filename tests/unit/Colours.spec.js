import * as colours from '@/helpers/Colours';

/* eslint-disable no-multi-spaces */
const tests = [
    { hex: '#000000', rgb: { r: 0,   g: 0,   b: 0   }, hsl: { h: 0,      s: 0,     l: 0     } },
    { hex: '#112233', rgb: { r: 17,  g: 34,  b: 51  }, hsl: { h: 210,    s: 50,    l: 13.33 } },
    { hex: '#445566', rgb: { r: 68,  g: 85,  b: 102 }, hsl: { h: 210,    s: 20,    l: 33.33 } },
    { hex: '#778899', rgb: { r: 119, g: 136, b: 153 }, hsl: { h: 210,    s: 14.29, l: 53.33 } },
    { hex: '#aabbcc', rgb: { r: 170, g: 187, b: 204 }, hsl: { h: 210,    s: 25,    l: 73.33 } },
    { hex: '#ddeeff', rgb: { r: 221, g: 238, b: 255 }, hsl: { h: 210,    s: 100,   l: 93.33 } },
    { hex: '#ffffff', rgb: { r: 255, g: 255, b: 255 }, hsl: { h: 0,      s: 0,     l: 100   } },
    { hex: '#54472e', rgb: { r: 84,  g: 71,  b: 46  }, hsl: { h: 39.47,  s: 29.23, l: 25.49 } },
    { hex: '#76717a', rgb: { r: 118, g: 113, b: 122 }, hsl: { h: 273.33, s: 3.83,  l: 46.08 } },
    { hex: '#490b14', rgb: { r: 73,  g: 11,  b: 20  }, hsl: { h: 351.29, s: 73.81, l: 16.47 } },
    { hex: '#2e6856', rgb: { r: 46,  g: 104, b: 86  }, hsl: { h: 161.38, s: 38.67, l: 29.41 } },
    { hex: '#76f44b', rgb: { r: 118, g: 244, b: 75  }, hsl: { h: 104.73, s: 88.48, l: 62.55 } },
    { hex: '#202d18', rgb: { r: 32,  g: 45,  b: 24  }, hsl: { h: 97.14,  s: 30.43, l: 13.53 } },
    { hex: '#363538', rgb: { r: 54,  g: 53,  b: 56  }, hsl: { h: 260,    s: 2.75,  l: 21.37 } },
    { hex: '#597c7f', rgb: { r: 89,  g: 124, b: 127 }, hsl: { h: 184.74, s: 17.59, l: 42.35 } },
    { hex: '#161616', rgb: { r: 22,  g: 22,  b: 22  }, hsl: { h: 0,      s: 0,     l: 8.63  } },
    { hex: '#b5bfb9', rgb: { r: 181, g: 191, b: 185 }, hsl: { h: 144,    s: 7.25,  l: 72.94 } },
    { hex: '#03b209', rgb: { r: 3,   g: 178, b: 9   }, hsl: { h: 122.06, s: 96.69, l: 35.49 } },
    { hex: '#5b6648', rgb: { r: 91,  g: 102, b: 72  }, hsl: { h: 82,     s: 17.24, l: 34.12 } },
    { hex: '#2d1c25', rgb: { r: 45,  g: 28,  b: 37  }, hsl: { h: 328.24, s: 23.29, l: 14.31 } },
    { hex: '#381132', rgb: { r: 56,  g: 17,  b: 50  }, hsl: { h: 309.23, s: 53.42, l: 14.31 } },
    { hex: '#010223', rgb: { r: 1,   g: 2,   b: 35  }, hsl: { h: 238.24, s: 94.44, l: 7.06  } },
    { hex: '#f47f11', rgb: { r: 244, g: 127, b: 17  }, hsl: { h: 29.07,  s: 91.16, l: 51.18 } },
    { hex: '#2b2633', rgb: { r: 43,  g: 38,  b: 51  }, hsl: { h: 263.08, s: 14.61, l: 17.45 } },
    { hex: '#89517d', rgb: { r: 137, g: 81,  b: 125 }, hsl: { h: 312.86, s: 25.69, l: 42.75 } },
    { hex: '#9b7c94', rgb: { r: 155, g: 124, b: 148 }, hsl: { h: 313.55, s: 13.42, l: 54.71 } },
    { hex: '#45349e', rgb: { r: 69,  g: 52,  b: 158 }, hsl: { h: 249.62, s: 50.48, l: 41.18 } },
    { hex: '#b5859c', rgb: { r: 181, g: 133, b: 156 }, hsl: { h: 331.25, s: 24.49, l: 61.57 } },
    { hex: '#8486a5', rgb: { r: 132, g: 134, b: 165 }, hsl: { h: 236.36, s: 15.49, l: 58.24 } },
    { hex: '#33292b', rgb: { r: 51,  g: 41,  b: 43  }, hsl: { h: 348,    s: 10.87, l: 18.04 } },
    { hex: '#133f06', rgb: { r: 19,  g: 63,  b: 6   }, hsl: { h: 106.32, s: 82.61, l: 13.53 } },
    { hex: '#697270', rgb: { r: 105, g: 114, b: 112 }, hsl: { h: 166.67, s: 4.11,  l: 42.94 } },
    { hex: '#82372d', rgb: { r: 130, g: 55,  b: 45  }, hsl: { h: 7.06,   s: 48.57, l: 34.31 } },
    { hex: '#8276bc', rgb: { r: 130, g: 118, b: 188 }, hsl: { h: 250.29, s: 34.31, l: 60    } },
    { hex: '#0c0c0b', rgb: { r: 12,  g: 12,  b: 11  }, hsl: { h: 60,     s: 4.35,  l: 4.51  } },
    { hex: '#020202', rgb: { r: 2,   g: 2,   b: 2   }, hsl: { h: 0,      s: 0,     l: 0.78  } },
    { hex: '#244907', rgb: { r: 36,  g: 73,  b: 7   }, hsl: { h: 93.64,  s: 82.5,  l: 15.69 } },
];
/* eslint-enable no-multi-spaces */

describe('Colours.js', () => {
    it('should convert hex to rgb', () => {
        tests.forEach((test) => {
            const rgb = colours.hex2rgb(test.hex);
            expect(rgb).toEqual(test.rgb);
            if (/^#([0-9a-f])\1([0-9a-f])\2([0-9a-f])\3$/.test(test.hex)) {
                const shortHex = `#${test.hex[1]}${test.hex[3]}${test.hex[5]}`;
                const shortRgb = colours.hex2rgb(shortHex);
                expect(shortRgb).toEqual(test.rgb);
            }
        });

        const badRgb = colours.hex2rgb('#ghijkl');
        expect(badRgb).toEqual(null);
    });

    it('should convert rgb to hex', () => {
        tests.forEach((test) => {
            const hex = colours.rgb2hex(test.rgb);
            expect(hex).toEqual(test.hex);
        });
    });

    it('should convert rgb to hsl', () => {
        tests.forEach((test) => {
            const hsl = colours.rgb2hsl(test.rgb);
            hsl.h = parseFloat((hsl.h * 360).toFixed(2));
            hsl.s = parseFloat((hsl.s * 100).toFixed(2));
            hsl.l = parseFloat((hsl.l * 100).toFixed(2));
            expect(hsl).toEqual(test.hsl);
        });
    });

    it('should convert hsl to rgb', () => {
        tests.forEach((test) => {
            const hsl = Object.assign({}, test.hsl);
            hsl.h /= 360;
            hsl.s /= 100;
            hsl.l /= 100;
            const rgb = colours.hsl2rgb(hsl);
            expect(rgb).toEqual(test.rgb);
        });
    });
});
