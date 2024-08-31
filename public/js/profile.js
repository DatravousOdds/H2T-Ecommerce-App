document.addEventListener('DOMContentLoaded', function () {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.right-navigation');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function(){
            // Hide all content
            contents.forEach(content => content.style.display = "none")
        })
    })
    
})