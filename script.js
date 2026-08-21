// Importando o Firebase diretamente do Google
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
window.anexarAtestado = anexarAtestado;
window.verAtestados = verAtestados;
window.fecharModalAtestados = fecharModalAtestados;
window.excluirAtestado = excluirAtestado;

let participantes = [];
let idEditando = null; 

// Alternar entre abas
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('nav button').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`sec-${tabId}`).classList.add('active');
    document.getElementById(`btn-tab-${tabId}`).classList.add('active');

    if(tabId === 'lista') {
        buscarParticipantesNoBanco();
    }
}

function filtrarLista() {
    const input = document.getElementById('search-input');
    if (!input) return;
    const termo = input.value.toLowerCase();
    const listaFiltrada = participantes.filter(p => p.nome && p.nome.toLowerCase().includes(termo));
    atualizarTabela(listaFiltrada);
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
        data_inscricao: document.getElementById('data_inscricao').value,
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
            const docRef = doc(db, "participantes", idEditando);
            
            const participanteAntigo = participantes.find(p => p.id === idEditando);
            if (!participante.foto && participanteAntigo && participanteAntigo.foto) {
                participante.foto = participanteAntigo.foto;
            }

            await updateDoc(docRef, participante);
            alert('Ficha atualizada com sucesso!');
            idEditando = null;
            document.querySelector('.btn-submit').textContent = "Salvar Ficha";
        } else {
            if (!participante.foto) participante.foto = null;
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
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Carregando dados da nuvem...</td></tr>';
    
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
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Erro ao buscar dados.</td></tr>';
    }
}

function atualizarTabela(lista) {
    const tbody = document.getElementById('tabela-corpo');
    tbody.innerHTML = '';
    document.getElementById('total-count').textContent = lista.length;

    lista.forEach(p => {
        const qtdAtestados = (p.atestados || []).length;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${p.nome}</strong></td>
            <td>${p.cpf}</td>
            <td>${p.balneario}</td>
            <td>${p.atividade}</td>
            <td>
                <span class="atestado-count">${qtdAtestados}</span>
                <button class="btn-atestado" onclick="anexarAtestado('${p.id}')">Anexar</button>
                ${qtdAtestados > 0 ? `<button class="btn-ver-atestado" onclick="verAtestados('${p.id}')">Ver/Excluir</button>` : ''}
            </td>
            <td>
                <button class="btn-edit" onclick="editarFicha('${p.id}')">Editar</button>
                <button class="btn-print" onclick="imprimirFicha('${p.id}')">Imprimir</button>
                <button class="btn-delete" onclick="excluirFicha('${p.id}')">Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Função para carregar os dados na aba de cadastro para edição
function editarFicha(id) {
    const p = participantes.find(part => String(part.id) === String(id));

    if (!p) {
        alert('Não foi possível localizar este participante. Atualize a lista e tente novamente.');
        return;
    }

    idEditando = p.id;

    const campos = {
        nome: p.nome || '',
        cpf: p.cpf || '',
        data_nasc: p.data_nasc || '',
        data_inscricao: p.data_inscricao || (p.ano_inscricao ? `${p.ano_inscricao}-01-01` : ''),
        tel_pessoal: p.tel_pessoal || '',
        tel_resp: p.tel_resp || '',
        balneario: p.balneario || '',
        endereco: p.endereco || '',
        profissao: p.profissao || '',
        atividade: p.atividade || '',
        medicamentos: p.medicamentos || ''
    };

    for (const [campo, valor] of Object.entries(campos)) {
        const elemento = document.getElementById(campo);
        if (elemento) elemento.value = valor;
    }

    switchTab('cadastro');

    const btnSalvar = document.querySelector('.btn-submit');
    if (btnSalvar) {
        btnSalvar.textContent = 'Atualizar Ficha';
        btnSalvar.disabled = false;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    const fotoHtml = p.foto ? `<img src="${p.foto}" class="ficha-photo" alt="Foto">` : `<div class="ficha-photo-placeholder">Sem Foto</div>`;
    const dataInscricao = p.data_inscricao ? formatarData(p.data_inscricao) : '';
    
    printArea.innerHTML = `
        <div class="ficha-print">
            <div class="ficha-header"><h2>CCI Pontal do Paraná - Ficha de Inscrição</h2><p>Data da inscrição: ${dataInscricao}</p></div>
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
            <div class="assinatura-page">
                <h2>Termo de Autorização e Ciência</h2>
                <p class="assinatura-texto">Eu, <strong>${p.nome}</strong>, portador(a) do RG ____________________, autorizo o Centro de Convivência do Idoso de Pontal do Paraná (CCI) a utilizar minha imagem, voz e depoimentos em materiais de divulgação institucional, sem ônus e por tempo indeterminado, garantidos o uso ético e o direito de revogação por escrito a qualquer momento. Declaro também estar ciente de que, para participar das atividades físicas, é OBRIGATÓRIA a apresentação de atestado médico. Por estar de acordo, assino o presente termo.</p>
                <div class="assinatura-data">Data: ____/____/________</div>
                <div class="assinatura-linha"></div>
                <p class="assinatura-nome">${p.nome}</p><p class="assinatura-legenda">Assinatura do participante</p>
            </div>
        </div>`;
    window.print();
}

function lerArquivoComoBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error("Falha ao ler o arquivo."));
        reader.readAsDataURL(file);
    });
}

async function anexarAtestado(id) {
    const p = participantes.find(part => part.id === id);
    if (!p) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,image/*';
    input.multiple = true;
    input.style.display = 'none';

    input.addEventListener('change', async () => {
        const arquivos = Array.from(input.files || []);
        if (!arquivos.length) {
            input.remove();
            return;
        }

        const btn = document.querySelector(`button[onclick="anexarAtestado('${id}')"]`);
        const textoOriginal = btn ? btn.textContent : '';

        try {
            const limite = 3 * 1024 * 1024;
            const invalidos = arquivos.filter(file =>
                file.size > limite ||
                (!file.type.startsWith('image/') && file.type !== 'application/pdf')
            );

            if (invalidos.length) {
                alert('O atestado deve ser PDF ou imagem e ter no máximo 3 MB por arquivo.');
                return;
            }

            if (btn) {
                btn.disabled = true;
                btn.textContent = 'Anexando...';
            }

            const atestadosAtuais = Array.isArray(p.atestados) ? [...p.atestados] : [];

            for (const arquivo of arquivos) {
                const base64 = await lerArquivoComoBase64(arquivo);
                atestadosAtuais.push({
                    nome: arquivo.name,
                    tipo: arquivo.type,
                    tamanho: arquivo.size,
                    arquivo: base64,
                    data: new Date().toISOString().slice(0, 10)
                });
            }

            await updateDoc(doc(db, "participantes", id), {
                atestados: atestadosAtuais
            });

            p.atestados = atestadosAtuais;
            atualizarTabela(participantes);

            alert(`${arquivos.length} atestado(s) anexado(s) com sucesso.`);
        } catch (e) {
            console.error("Erro ao anexar atestado:", e);
            alert('Não foi possível anexar o atestado. Verifique a conexão com o Firebase e tente novamente.');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = textoOriginal || 'Anexar';
            }
            input.remove();
        }
    });

    document.body.appendChild(input);
    input.click();
}

function verAtestados(id) {
    const p = participantes.find(part => part.id === id);
    if (!p || !p.atestados || p.atestados.length === 0) return;

    const modalBody = document.getElementById('lista-atestados-modal');
    modalBody.innerHTML = '';

    p.atestados.forEach((atestado, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'atestado-item-modal';
        
        let visualizacaoHtml = '';
        if (atestado.tipo && atestado.tipo.startsWith('image/')) {
            visualizacaoHtml = `<img src="${atestado.arquivo}" alt="${atestado.nome}" style="max-width:100%; max-height:300px; display:block; margin-bottom:10px;" />`;
        } else {
            visualizacaoHtml = `<embed src="${atestado.arquivo}" type="application/pdf" width="100%" height="300px" style="margin-bottom:10px;" />`;
        }

        itemDiv.innerHTML = `
            <p><strong>${atestado.nome}</strong> ${atestado.data ? `(Enviado em: ${formatarData(atestado.data)})` : ''}</p>
            ${visualizacaoHtml}
            <button class="btn-delete" onclick="excluirAtestado('${p.id}', ${index})">Excluir este Atestado</button>
            <hr style="margin: 15px 0;">
        `;
        modalBody.appendChild(itemDiv);
    });

    document.getElementById('modal-atestados').style.display = 'flex';
}

function fecharModalAtestados() {
    document.getElementById('modal-atestados').style.display = 'none';
}

async function excluirAtestado(participanteId, indexAtestado) {
    if (!confirm('Deseja realmente excluir este atestado?')) return;

    const p = participantes.find(part => part.id === participanteId);
    if (!p) return;

    p.atestados.splice(indexAtestado, 1);

    try {
        const docRef = doc(db, "participantes", participanteId);
        await updateDoc(docRef, { atestados: p.atestados });
        
        alert('Atestado excluído com sucesso!');
        if (p.atestados.length === 0) {
            fecharModalAtestados();
        } else {
            verAtestados(participanteId);
        }
        atualizarTabela(participantes);
    } catch (e) {
        console.error("Erro ao excluir atestado:", e);
        alert('Erro ao excluir o atestado no banco de dados.');
    }
}

window.onload = () => {
    if (document.getElementById('sec-lista').classList.contains('active')) {
        buscarParticipantesNoBanco();
    }
};
