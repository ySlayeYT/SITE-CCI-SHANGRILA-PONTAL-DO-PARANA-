// Importando o Firebase diretamente do Google
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// SUAS CHAVES DO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyDtrs8K4SB96b5VHhj3gW2yLUfegS9DHGs",
  authDomain: "sistema-cci-pontal-do-parana.firebaseapp.com",
  projectId: "sistema-cci-pontal-do-parana",
  storageBucket: "sistema-cci-pontal-do-parana.firebasestorage.app",
  messagingSenderId: "957616639810",
  appId: "1:957616639810:web:7d258a77f17110eed9c2db",
  measurementId: "G-N7RJWLV6P1"
};

// Inicializando o Banco de Dados
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Deixa o escopo global acessar as funções
window.switchTab = switchTab;
window.filtrarLista = filtrarLista;
window.excluirFicha = excluirFicha;
window.imprimirFicha = imprimirFicha;
window.editarFicha = editarFicha;

let participantes = [];
let idEditando = null; // Variável para controlar se estamos editando um cadastro

// Alternar entre abas
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('nav button').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`sec-${tabId}`).classList.add('active');
    document.getElementById(`btn-tab-${tabId}`).classList.add('active');

    if(tabId === 'lista') buscarParticipantesNoBanco();
}

function convertImageToBase64(file, callback) {
    const reader = new FileReader();
    reader.onloadend = () => callback(reader.result);
    reader.readAsDataURL(file);
}

// Salvar ou Atualizar no Banco de Dados Firebase
document.getElementById('form-cadastro').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btnSalvar = document.querySelector('.btn-submit');
    btnSalvar.textContent = "Salvando na nuvem...";
    btnSalvar.disabled = true;

    const fotoInput = document.getElementById('foto');
    
    const participante = {
        nome: document.getElementById('nome').value,
        cpf: document.getElementById('cpf').value,
        data_nasc: document.getElementById('data_nasc').value,
        ano_inscricao: document.getElementById('ano_inscricao').value,
        tel_pessoal: document.getElementById('tel_pessoal').value,
        tel_resp: document.getElementById('tel_resp').value,
        balneario: document.getElementById('balneario').value,
        endereco: document.getElementById('endereco').value,
        profissao: document.getElementById('profissao').value,
        atividade: document.getElementById('atividade').value,
        medicamentos: document.getElementById('medicamentos').value
    };

    if (fotoInput.files.length > 0) {
        convertImageToBase64(fotoInput.files[0], async (base64Img) => {
            participante.foto = base64Img;
            await salvarOuAtualizarNoFirebase(participante);
        });
    } else {
        await salvarOuAtualizarNoFirebase(participante);
    }
});

async function salvarOuAtualizarNoFirebase(participante) {
    try {
        if (idEditando) {
            // Se tem um ID, significa que estamos editando
            const docRef = doc(db, "participantes", idEditando);
            // Se nenhuma foto nova foi selecionada, removemos a chave foto para não apagar a anterior
            if (!participante.foto) {
                delete participante.foto;
            }
            await updateDoc(docRef, participante);
            alert('Ficha atualizada com sucesso!');
            idEditando = null;
            document.querySelector('.btn-submit').textContent = "Salvar Ficha";
        } else {
            // Senão, cria um novo registro
            await addDoc(collection(db, "participantes"), participante);
            alert('Ficha salva com sucesso no Banco de Dados!');
        }

        document.getElementById('form-cadastro').reset();
        switchTab('lista');
    } catch (e) {
        console.error("Erro ao salvar: ", e);
        alert('Erro ao salvar no banco. Verifique sua conexão.');
    } finally {
        const btnSalvar = document.querySelector('.btn-submit');
        if (!idEditando) btnSalvar.textContent = "Salvar Ficha";
        btnSalvar.disabled = false;
    }
}

// Buscar do Firebase
async function buscarParticipantesNoBanco() {
    const tbody = document.getElementById('tabela-corpo');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Carregando dados da nuvem...</td></tr>';
    
    participantes = [];
    try {
        const querySnapshot = await getDocs(collection(db, "participantes"));
        querySnapshot.forEach((doc) => {
            let p = doc.data();
            p.id = doc.id; 
            participantes.push(p);
        });
        atualizarTabela(participantes);
    } catch (e) {
        console.error("Erro ao buscar: ", e);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Erro ao buscar dados.</td></tr>';
    }
}

function atualizarTabela(lista) {
    const tbody = document.getElementById('tabela-corpo');
    tbody.innerHTML = '';
    document.getElementById('total-count').textContent = lista.length;

    lista.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${p.nome}</strong></td>
            <td>${p.cpf}</td>
            <td>${p.balneario}</td>
            <td>${p.atividade}</td>
            <td>
                <button class="btn-edit" onclick="editarFicha('${p.id}')">Editar</button>
                <button class="btn-print" onclick="imprimirFicha('${p.id}')">Imprimir</button>
                <button class="btn-delete" onclick="excluirFicha('${p.id}')">Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filtrarLista() {
    const termo = document.getElementById('search-input').value.toLowerCase();
    const listaFiltrada = participantes.filter(p => p.nome.toLowerCase().includes(termo));
    atualizarTabela(listaFiltrada);
}

// Função para carregar os dados na aba de cadastro para edição
function editarFicha(id) {
    const p = participantes.find(part => part.id === id);
    if (!p) return;

    idEditando = id;

    // Preenche o formulário com os dados atuais
    document.getElementById('nome').value = p.nome || '';
    document.getElementById('cpf').value = p.cpf || '';
    document.getElementById('data_nasc').value = p.data_nasc || '';
    document.getElementById('ano_inscricao').value = p.ano_inscricao || '2026';
    document.getElementById('tel_pessoal').value = p.tel_pessoal || '';
    document.getElementById('tel_resp').value = p.tel_resp || '';
    document.getElementById('balneario').value = p.balneario || '';
    document.getElementById('endereco').value = p.endereco || '';
    document.getElementById('profissao').value = p.profissao || '';
    document.getElementById('atividade').value = p.atividade || '';
    document.getElementById('medicamentos').value = p.medicamentos || '';

    // Muda para a aba de cadastro e altera o texto do botão
    switchTab('cadastro');
    document.querySelector('.btn-submit').textContent = "Atualizar Ficha";
}

// Excluir do Firebase
async function excluirFicha(id) {
    if(confirm('Tem certeza que deseja excluir da nuvem definitivamente?')) {
        try {
            await deleteDoc(doc(db, "participantes", id));
            buscarParticipantesNoBanco(); 
        } catch (e) {
            console.error("Erro ao excluir: ", e);
            alert("Erro ao excluir");
        }
    }
}

function formatarData(dataISO) {
    if (!dataISO) return '';
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
}

function imprimirFicha(id) {
    const p = participantes.find(part => part.id === id);
    if(!p) return;

    const printArea = document.getElementById('print-area');
    
    const fotoHtml = p.foto 
        ? `<img src="${p.foto}" class="ficha-photo" alt="Foto">` 
        : `<div class="ficha-photo-placeholder">Sem Foto</div>`;

    printArea.innerHTML = `
        <div class="ficha-print">
            <div class="ficha-header">
                <h2>CCI Pontal do Paraná - Ficha de Inscrição</h2>
                <p>Ano letivo: ${p.ano_inscricao}</p>
            </div>
            <div class="ficha-content">
                ${fotoHtml}
                <div class="ficha-data">
                    <div class="ficha-row"><strong>Nome:</strong> ${p.nome}</div>
                    <div class="ficha-row"><strong>CPF:</strong> ${p.cpf}</div>
                    <div class="ficha-row"><strong>Data de Nasc:</strong> ${formatarData(p.data_nasc)}</div>
                    <div class="ficha-row"><strong>Telefone Pessoal:</strong> ${p.tel_pessoal}</div>
                    <div class="ficha-row"><strong>Telefone Responsável:</strong> ${p.tel_resp}</div>
                    <div class="ficha-row"><strong>Balneário:</strong> ${p.balneario}</div>
                    <div class="ficha-row"><strong>Endereço:</strong> ${p.endereco}</div>
                    <div class="ficha-row"><strong>Profissão:</strong> ${p.profissao}</div>
                    <div class="ficha-row"><strong>Atividade no CCI:</strong> ${p.atividade}</div>
                    <div class="ficha-row"><strong>Medicamentos:</strong> ${p.medicamentos}</div>
                </div>
            </div>
        </div>
    `;
    window.print();
}

window.onload = () => {
    if (document.getElementById('sec-lista').classList.contains('active')) {
        buscarParticipantesNoBanco();
    }
};
