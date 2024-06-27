
const createProduct = (data) => {
    let prodContent = document.querySelector('.product-container');
    prodContent.innerHTML += `
    <div class="pro product-card">
    <img src="${data.images[0] || 'images/no image.png'}"class="product-thumb" alt="">
    <button class="card-action-btn edit-btn" onclick="location.href = 'add-product/${data.id}'"><img src="images/edit.png" alt=""></button>
    <button class="card-action-btn open-btn" onclick="location.href = '/products/${data.id}'"><img src="images/open.png" alt=""></button>
    <button class="card-action-btn delete-popup-btn" onclick="openDelpPopup('${data.id}')"><img src="images/delete.png" 
    alt=""></button>
    <div class="des">
        <span>${data.shortDes}</span>
        
        <h5>${data.name}</h5>
        <div class="star">
            <i class="fas fa-star"></i>
            <i class="fas fa-star"></i>
            <i class="fas fa-star"></i>
            <i class="fas fa-star"></i>
            <i class="fas fa-star"></i>
        </div>
        
        <h4 class="price">$${data.sellerPrice}</h4><span class="actual-price">$${data.actualPrice}</span>
    </div>
    <a href="#"><i class="fas fa-shopping-cart cart"></i></a>
</div>
`;
}

const openDelpPopup = (id) => {
    let delAlert = document.querySelector('.delete-alert');
    delAlert.style.display = 'flex';

    let closeBtn = document.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => delAlert.style.display = null);

    let delBtn = document.querySelector('.delete-btn');
    delBtn.addEventListener('click', () => deleteItem(id))
}

const deleteItem = (id) => {
    fetch('/delete-product', {
        method: 'post',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ id: id })
    }).then(res => res.json())
        .then(data => {
            if (data == 'success') {
                location.reload();
            } else {
                showAlert('some error occured while deleting the product. Try Again');
            }
        })
}