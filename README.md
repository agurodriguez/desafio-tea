# Desafío TEA

[Manual Técnico](docs/manual-tecnico-desafio-tea%201.4.pdf)

## Desarrollo 

Servicios provistos por la IMM:

* Orion: http://kobauy.ddns.net:1026
* Simulador: http://kobauy.ddns.net:1080

Se puede acceder a la máquina virtual que provee estos servicios vía SSH en el puerto `1022` de la dirección `kobauy.ddns.net`:

```bash
ssh desafio@kobauy.ddns.net -p 1022
```

### Orion

#### Algunos endpoints

Descripción                  | Url
-----------------------------|------------------------------------------------------
Ómnibus registrados en Orion | http://kobauy.ddns.net:1026/v2/entities?type=Bus

#### Logs

Para ver los logs ejecutar la siguiente secuencia de comandos:

```bash
ssh desafio@kobauy.ddns.net -p 1022
sudo docker logs fiware_orion_1
```

### Simulador

#### Algunos endpoints

Descripción                  | Url
-----------------------------|------------------------------------------------------
Iniciar simulador            | http://kobauy.ddns.net:1080/api/simulador?op=iniciar
Pausar simulador             | http://kobauy.ddns.net:1080/api/simulador?op=pausar
Trayectos por línea          | http://kobauy.ddns.net:1080/api/trayectosporlinea

