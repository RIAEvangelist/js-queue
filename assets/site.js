const toggle=document.querySelector('.nav-toggle');
const navigation=document.querySelector('.site-nav');

if(toggle && navigation){
    toggle.addEventListener('click',()=>{
        const open=navigation.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded',String(open));
    });

    navigation.addEventListener('click',event=>{
        if(event.target.closest('a')){
            navigation.classList.remove('is-open');
            toggle.setAttribute('aria-expanded','false');
        }
    });
}

if(navigator.clipboard){
    for(const block of document.querySelectorAll('.code-block')){
        const code=block.querySelector('code');
        if(!code){
            continue;
        }

        const button=document.createElement('button');
        button.className='copy-button';
        button.type='button';
        button.textContent='Copy';
        button.setAttribute('aria-label','Copy code to clipboard');
        button.addEventListener('click',async()=>{
            try{
                await navigator.clipboard.writeText(code.textContent);
                button.textContent='Copied';
                setTimeout(()=>{ button.textContent='Copy'; },1500);
            }catch{
                button.textContent='Select code';
            }
        });
        block.append(button);
    }
}
