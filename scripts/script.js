const camera = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const btnFoto = document.getElementById("btnFoto");
const btnRecomecar = document.getElementById("btnRecomecar");
const btnPublicar = document.getElementById("btnPublicar");
const instrucao = document.getElementById("instrucao");

const fotoAmbiente = document.getElementById("fotoAmbiente");
const fotoSelfie = document.getElementById("fotoSelfie");
const vazioAmbiente = document.getElementById("vazioAmbiente");
const vazioSelfie = document.getElementById("vazioSelfie");

const descricao = document.getElementById("descricao");
const localizacao = document.getElementById("localizacao");
const listaPosts = document.getElementById("listaPosts");
const semPost = document.getElementById("semPost");

let stream;
let etapa = 1;
let ambiente = null;
let selfie = null;

const horas24 = 24 * 60 * 60 * 1000;

async function abrirCamera(tipo) {
    pararCamera();

    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: tipo }
            },
            audio: false
        });

        camera.srcObject = stream;

    } catch (erro) {
        console.log(erro);
        alert("Não foi possível abrir a câmera.");
    }
}

function pararCamera() {
    if (stream) {
        stream.getTracks().forEach(function(track) {
            track.stop();
        });

        stream = null;
    }
}

function tirarFoto() {
    if (!camera.videoWidth) {
        return null;
    }

    let largura = camera.videoWidth;
    let altura = camera.videoHeight;

    if (largura > 700) {
        altura = altura * (700 / largura);
        largura = 700;
    }

    canvas.width = largura;
    canvas.height = altura;

    const ctx = canvas.getContext("2d");

    ctx.drawImage(
        camera,
        0,
        0,
        largura,
        altura
    );

    return canvas.toDataURL("image/jpeg", 0.65);
}

btnFoto.addEventListener("click", async function() {
    const foto = tirarFoto();

    if (!foto) {
        alert("Espere a câmera carregar.");
        return;
    }

    if (etapa === 1) {
        ambiente = foto;

        fotoAmbiente.src = ambiente;
        fotoAmbiente.style.display = "block";
        vazioAmbiente.style.display = "none";

        etapa = 2;

        instrucao.innerText = "Agora tire uma selfie.";
        btnFoto.innerText = "Tirar selfie";

        await abrirCamera("user");

    } else if (etapa === 2) {
        selfie = foto;

        fotoSelfie.src = selfie;
        fotoSelfie.style.display = "block";
        vazioSelfie.style.display = "none";

        etapa = 3;

        instrucao.innerText = "Fotos prontas.";
        btnFoto.disabled = true;
        btnPublicar.disabled = false;

        pararCamera();
    }
});

btnRecomecar.addEventListener("click", function() {
    ambiente = null;
    selfie = null;
    etapa = 1;

    fotoAmbiente.src = "";
    fotoSelfie.src = "";

    fotoAmbiente.style.display = "none";
    fotoSelfie.style.display = "none";

    vazioAmbiente.style.display = "flex";
    vazioSelfie.style.display = "flex";

    btnFoto.disabled = false;
    btnPublicar.disabled = true;

    btnFoto.innerText = "Tirar foto";
    instrucao.innerText = "Tire uma foto do lugar onde você está.";

    abrirCamera("environment");
});

function pegarLocalizacao() {
    return new Promise(function(resolve, reject) {
        if (!navigator.geolocation) {
            reject();
            return;
        }

        localizacao.innerText = "Buscando localização...";

        navigator.geolocation.getCurrentPosition(
            async function(posicao) {
                try {
                    const latitude = posicao.coords.latitude;
                    const longitude = posicao.coords.longitude;

                    const endereco = await buscarEndereco(latitude, longitude);

                    localizacao.innerText = endereco;
                    resolve(endereco);

                } catch (erro) {
                    reject();
                }
            },

            function() {
                reject();
            }
        );
    });
}

async function buscarEndereco(latitude, longitude) {
    const url = "https://nominatim.openstreetmap.org/reverse?lat=" +
        latitude + "&lon=" + longitude +
        "&format=jsonv2&accept-language=pt-BR";

    const resposta = await fetch(url);

    if (!resposta.ok) {
        throw new Error("Erro ao buscar endereço");
    }

    const dados = await resposta.json();
    const endereco = dados.address || {};

    const bairro =
        endereco.suburb ||
        endereco.neighbourhood ||
        endereco.quarter ||
        "";

    const cidade =
        endereco.city ||
        endereco.town ||
        endereco.village ||
        "";

    if (bairro && cidade) {
        return bairro + ", " + cidade;
    }

    if (cidade) {
        return cidade;
    }

    return dados.display_name || "Localização encontrada";
}

btnPublicar.addEventListener("click", async function() {
    if (!ambiente || !selfie) {
        return;
    }

    btnPublicar.disabled = true;
    btnPublicar.innerText = "Publicando...";

    try {
        const local = await pegarLocalizacao();

        const novoPost = {
            ambiente: ambiente,
            selfie: selfie,
            descricao: descricao.value,
            local: local,
            data: Date.now()
        };

        let posts = JSON.parse(localStorage.getItem("meusNows")) || [];

        posts.push(novoPost);

        localStorage.setItem(
            "meusNows",
            JSON.stringify(posts)
        );

        mostrarPosts();
        prepararNovoNow();

    } catch (erro) {
        console.log(erro);

        btnPublicar.disabled = false;
        btnPublicar.innerText = "Publicar Now";

        localizacao.innerText = "Não foi possível obter a localização.";

        alert("Permita o acesso à localização.");
    }
});

function prepararNovoNow() {
    ambiente = null;
    selfie = null;
    etapa = 1;

    fotoAmbiente.src = "";
    fotoSelfie.src = "";

    fotoAmbiente.style.display = "none";
    fotoSelfie.style.display = "none";

    vazioAmbiente.style.display = "flex";
    vazioSelfie.style.display = "flex";

    descricao.value = "";

    localizacao.innerText = "Localização será buscada ao publicar.";

    btnFoto.disabled = false;
    btnFoto.innerText = "Tirar foto";

    btnPublicar.disabled = true;
    btnPublicar.innerText = "Publicar Now";

    instrucao.innerText = "Tire uma foto do lugar onde você está.";

    abrirCamera("environment");
}

function mostrarPosts() {
    let posts = JSON.parse(localStorage.getItem("meusNows")) || [];

    posts = posts.filter(function(post) {
        return Date.now() - post.data < horas24;
    });

    localStorage.setItem(
        "meusNows",
        JSON.stringify(posts)
    );

    listaPosts.innerHTML = "";

    if (posts.length === 0) {
        semPost.style.display = "flex";
        return;
    }

    semPost.style.display = "none";

    posts.slice().reverse().forEach(function(dados) {
        criarPost(dados);
    });
}

function criarPost(dados) {
    const card = document.createElement("div");
    card.className = "post";

    const fotos = document.createElement("div");
    fotos.className = "fotos-post";

    const principal = document.createElement("img");
    principal.className = "foto-principal";
    principal.src = dados.ambiente;
    principal.draggable = true;

    const menor = document.createElement("img");
    menor.className = "foto-menor";
    menor.src = dados.selfie;
    menor.draggable = true;

    const info = document.createElement("div");
    info.className = "info-post";

    const texto = document.createElement("p");
    texto.className = "texto-post";
    texto.innerText = dados.descricao || "Sem descrição";

    const local = document.createElement("p");
    local.className = "local-post";
    local.innerText = dados.local;

    const tempo = document.createElement("p");
    tempo.className = "tempo-post";
    tempo.innerText = calcularTempo(dados.data);

    fotos.appendChild(principal);
    fotos.appendChild(menor);

    info.appendChild(texto);
    info.appendChild(local);
    info.appendChild(tempo);

    card.appendChild(fotos);
    card.appendChild(info);

    listaPosts.appendChild(card);

    menor.addEventListener("click", function() {
        trocarFotos(principal, menor);
    });

    principal.addEventListener("dragstart", function(event) {
        event.dataTransfer.setData("text/plain", "foto");
    });

    menor.addEventListener("dragstart", function(event) {
        event.dataTransfer.setData("text/plain", "foto");
    });

    fotos.addEventListener("dragover", function(event) {
        event.preventDefault();
    });

    fotos.addEventListener("drop", function(event) {
        event.preventDefault();
        trocarFotos(principal, menor);
    });
}

function trocarFotos(principal, menor) {
    const temp = principal.src;

    principal.src = menor.src;
    menor.src = temp;
}

function calcularTempo(data) {
    const diferenca = Date.now() - data;

    const minutos = Math.floor(diferenca / 60000);
    const horas = Math.floor(diferenca / 3600000);

    if (minutos < 1) {
        return "Publicado agora";
    }

    if (horas < 1) {
        return "Publicado há " + minutos + " min";
    }

    return "Publicado há " + horas + " h";
}

mostrarPosts();
abrirCamera("environment");

setInterval(function() {
    mostrarPosts();
}, 60000);