const fs = require('fs');
const http = require('http');

/*
 * Guardemos la data obtenida desde los ws así podemos macanearla
 * e intentar de nuevo sin tener que volver a descargar todos los 
 * datos de nuevo
 */
let k = 0;
const MAX_LINEA = 494;
const MAX_PARADA = 6318;
for (let i = 0; i < MAX_PARADA; i++) {
    for (let j = 0; j < MAX_LINEA; j++) {
        // demoremos 10ms cada una de las request para no atomizar al endpoint
        // el script debería demorar aprox (494 * 6318 * 10) ms en terminar
        // (494 * 6318 * 10) ms ~= 520 mins = 8 horas, 40 mins
        setTimeout(() => {

            let req = http.get(`http://www.montevideo.gub.uy/transporteRest/pasadas/${i}/HABIL/${j}`, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    let folder = `${__dirname}/../data/${i}`;
                    if (!fs.existsSync(folder)) fs.mkdirSync(folder);
                    fs.writeFileSync(`${folder}/${j}`, data);
                });
            });

            req.on('error', err => {
                // console.log(err);
            });

        }, 10 * k++);
    }
}
