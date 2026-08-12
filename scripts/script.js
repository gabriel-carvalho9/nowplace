const camera = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const btnFoto = document.getElementById("btnFoto");
const btnRecomecar = document.getElementById("btnRecomecar");
const btnPublicar = document.getElementById("btnPublicar");
const instrucao = document.getElementById("instrucao");
const fotoAmbiente = document.getElementById("fotoAmbiente");
const fotoSelfie = document.getElementById("fotoSelfie");
const descricao = document.getElementById("descricao");
const localizacao = document.getElementById("localizacao");
const semPost = document.getElementById("semPost");
const post = document.getElementById("post");
const fotoPrincipal = document.getElementById("fotoPrincipal");
const fotoMenor = document.getElementById("fotoMenor");
const textoPost = document.getElementById("textoPost");
const localPost = document.getElementById("localPost");
const fotosPost = document.getElementById("fotosPost");

let stream;
let etapa = 1;
let ambiente;
let selfie;
let local;

async function abrirCamera(tipo) {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }

    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: tipo },
            audio: false
        });

        camera.srcObject = stream;
    } catch (erro) {
        alert("Não foi possível abrir a câmera.");
        console.log(erro);
    }
}

function tirarFoto() {
    canvas.width = camera.videoWidth;
    canvas.height = camera.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(camera, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg");
}

btnFoto.addEventListener("click", async function () {
    if (etapa === 1) {
        ambiente = tirarFoto();

        fotoAmbiente.src = ambiente;
        fotoAmbiente.style.display = "block";

        etapa = 2;
        instrucao.innerText = "Agora tire uma selfie.";
        btnFoto.innerText = "Tirar selfie";

        await abrirCamera("user");
    } else if (etapa === 2) {
        selfie = tirarFoto();

        fotoSelfie.src = selfie;
        fotoSelfie.style.display = "block";

        etapa = 3;
        instrucao.innerText = "Fotos prontas.";
        btnFoto.disabled = true;
        btnPublicar.disabled = false;

        pararCamera();
    }
});

function pararCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
}

btnRecomecar.addEventListener("click", function () {
    ambiente = null;
    selfie = null;
    etapa = 1;

    fotoAmbiente.style.display = "none";
    fotoSelfie.style.display = "none";

    btnFoto.disabled = false;
    btnPublicar.disabled = true;
    btnFoto.innerText = "Tirar foto";
    instrucao.innerText = "Tire uma foto do lugar onde você está.";

    abrirCamera("environment");
});

function pegarLocalizacao() {
    return new Promise(function (resolve, reject) {
        navigator.geolocation.getCurrentPosition(
            async function (posicao) {
                const latitude = posicao.coords.latitude;
                const longitude = posicao.coords.longitude;

                local = await buscarEndereco(latitude, longitude);
                localizacao.innerText = local;

                resolve();
            },
            function () {
                reject();
            }
        );
    });
}

async function buscarEndereco(latitude, longitude) {
    const url = "https://nominatim.openstreetmap.org/reverse?lat=" +
        latitude + "&lon=" + longitude + "&format=jsonv2";

    const resposta = await fetch(url);
    const dados = await resposta.json();

    if (dados.address) {
        const cidade =
            dados.address.city ||
            dados.address.town ||
            dados.address.village ||
            "";

        const bairro =
            dados.address.suburb ||
            dados.address.neighbourhood ||
            "";

        if (bairro && cidade) {
            return bairro + ", " + cidade;
        }

        if (cidade) {
            return cidade;
        }
    }

    return dados.display_name;
}

btnPublicar.addEventListener("click", async function () {
    btnPublicar.innerText = "Publicando...";

    try {
        await pegarLocalizacao();

        fotoPrincipal.src = ambiente;
        fotoMenor.src = selfie;

        textoPost.innerText = descricao.value;
        localPost.innerText = "📍" + local;

        semPost.style.display = "none";
        post.style.display = "block";

        btnPublicar.innerText = "Publicado";

        localStorage.setItem("ultimoNow", Date.now());
    } catch {
        btnPublicar.innerText = "Publicar";
        alert("Permita o acesso à localização.");
    }
});

function trocarFotos() {
    const temp = fotoPrincipal.src;
    fotoPrincipal.src = fotoMenor.src;
    fotoMenor.src = temp;
}

fotoMenor.addEventListener("click", trocarFotos);

fotoPrincipal.addEventListener("dragstart", function (event) {
    event.dataTransfer.setData("text", "foto");
});

fotoMenor.addEventListener("dragstart", function (event) {
    event.dataTransfer.setData("text", "foto");
});

fotosPost.addEventListener("dragover", function (event) {
    event.preventDefault();
});

fotosPost.addEventListener("drop", function (event) {
    event.preventDefault();
    trocarFotos();
});

abrirCamera("environment");