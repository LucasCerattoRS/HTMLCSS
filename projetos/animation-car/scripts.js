// Selecionando os botões corretamente (por posição na div .arrows)
let arrows = document.querySelectorAll('.arrows button');
let prevButton = arrows[0]; // Primeiro botão (seta esquerda)
let nextButton = arrows[1]; // Segundo botão (seta direita)

let container = document.querySelector('.car-animation');
let items = document.querySelectorAll('.list .item');
let indicators = document.querySelector('.indicators');
let dots = indicators.querySelectorAll('ul li');
let numberIndicator = indicators.querySelector('.number');

let active = 0;
let firstPosition = 0;
let lastPosition = items.length - 1;

// Função para atualizar indicadores
function updateIndicators() {
    // Atualiza o número (01, 02, 03)
    numberIndicator.textContent = '0' + (active + 1);
    
    // Atualiza as bolinhas
    dots.forEach((dot, index) => {
        if (index === active) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

// Botão ANTERIOR (seta esquerda)
prevButton.onclick = () => {
    let itemOld = container.querySelector('.list .item.active');
    itemOld.classList.remove('active');

    active = active - 1 < firstPosition ? lastPosition : active - 1;
    items[active].classList.add('active');
    
    updateIndicators();
}

// Botão PRÓXIMO (seta direita)
nextButton.onclick = () => {
    let itemOld = container.querySelector('.list .item.active');
    itemOld.classList.remove('active');

    active = active + 1 > lastPosition ? 0 : active + 1;
    items[active].classList.add('active');
    
    updateIndicators();
}