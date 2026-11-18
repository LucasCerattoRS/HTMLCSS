let btnNext = document.querySelector('.next')
let btnBack = document.querySelector('.back')

let container = document.querySelector('.container')
let list = document.querySelector('.container .list')
let thumb = document.querySelector('.container .thumb')

// Um só timer: cliques rápidos não podem deixar vários setTimeout de 3 s
// vivos, senão o do 1º clique tira a classe no meio da animação do 2º.
let timeoutId

btnNext.onclick = () => {
    moveItemsOnClick('next')
}
btnBack.onclick = () => {
    moveItemsOnClick('back')
}

function moveItemsOnClick(type) {
    clearTimeout(timeoutId)
    container.classList.remove('next', 'back')

    let listItems = document.querySelectorAll('.list .list-item')
    let thumbItems = document.querySelectorAll('.thumb .thumb-item')

    if (type === 'next') {
        list.appendChild(listItems[0])
        thumb.appendChild(thumbItems[0])
        container.classList.add('next')
    }
    else if (type === 'back') {
        list.prepend(listItems[listItems.length - 1])
        thumb.prepend(thumbItems[listItems.length - 1])
        container.classList.add('back')
    }

    timeoutId = setTimeout(() => {
        container.classList.remove('next')
        container.classList.remove('back')
    }, 3000)
}