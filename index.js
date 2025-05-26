#!/usr/bin/env node

// Declara uma variavel chamada "Puppeteer", armazena importação do pacote Puppeteer: 
const puppeteer = require('puppeteer');

// Rodar coisas que demoram, esperar terminar antes de continuar:
async function pegarTagsVideosTendencia() {

    // Espera terminar de abrir o navegador antes de continuar, liga navegador e roda em modo oculto:
    const browser = await puppeteer.launch({ 
        headless: "new",  // Usa novo modo Headless do Chrome
        args: ['--no-sandbox']  // Evita erros em alguns sistemas
    });

    // Cria aba nova no navegador:
    const page = await browser.newPage();
    
    // Configuração extra (invisível para usuário):
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    // Diz "vai para esse site", espera carregar antes de continuar:
    await page.goto('https://www.youtube.com/feed/trending', {
        waitUntil: 'networkidle2',  // Espera mais tempo
        timeout: 30000  // 30 segundos máximo
    });

    // Espera aparecer um elemento especifico na pagina, procura por link e id, espera elemento aparecer antes de carregar:
    await page.waitForSelector('a#video-title', { timeout: 15000 });  // Timeout aumentado

    // Lê todos os elementos que batem com o seletor:
    const links = await page.$$eval('a#video-title', anchors =>

        // Lista todos os links encontrados, pega só o endereço de cada video, filtra os links que contem a palavra "watch":
        anchors.map(a => a.href).filter(href => href.includes('watch'))
    );

    // Guarda tags de cada video:
    const tagsPorVideo = {};

    // Repete o que está dentro para cada link, cria variavel link para cada item, pega somente os 5 primeiros links da losta:
    for (let link of links.slice(0, 5)) {

        // Abre uma nova aba do navegador, só que para video especifico:
        const videoPage = await browser.newPage();
        
        try {
            // Vai para a pagina do video, usando link:
            await videoPage.goto(link, { timeout: 20000 });  // Timeout aumentado

            // Pega elemento da pagina, que tem as palavras chaves do video:
            const tags = await videoPage.$eval(
                'meta[name="keywords"]',

                // Pega conteudo da tag:
                el => el.getAttribute('content')

                // Se der erro, retorna null sem quebrar:
            ).catch(() => null);

            // Coloca tags dentro do objeto, com o link como chave:
            tagsPorVideo[link] = tags ? tags.split(',').map(t => t.trim()) : [];
            
            // Pausa discreta entre vídeos:
            await new Promise(resolve => setTimeout(resolve, 1000));
        } finally {
            // Fecha aba do video depois de pegar tags:
            await videoPage.close();
        }
    }

    // Fecha todo navegador, depois que ja pegou todas as tags:
    await browser.close();

    // Retorna o objeto com os links e as listas das tags
    return tagsPorVideo;
}

// Execução com tratamento de erro discreto:
pegarTagsVideosTendencia()
    .then(result => {
        console.log(result);
    })
    .catch(err => {
        console.error('Ocorreu um erro:', err.message);
        process.exit(1);
    });