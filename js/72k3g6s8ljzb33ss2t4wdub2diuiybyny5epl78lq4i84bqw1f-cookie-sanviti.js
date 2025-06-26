// document.body.classList.toggle('c_darkmode');//DARK 

(function(){
    'use strict';
  


    var CookieConsent = function(root){
        
        // MUDE ESTE FLAG FALSE PARA DISABLE console.log()
        var ENABLE_LOGS = true;
      
        var _config = {
            current_lang : "pt",         			    
            autorun: true,                      
            cookie_name: 'cc_cookie',
            cookie_expiration : 182,                
            cookie_domain: location.hostname,      
         
            cookie_path: "/",
            cookie_same_site: "Lax",
            script_selector: "data-cookiecategory"
        };

     

        /**
         * Objeto que contém os métodos principais (.show, .run, ...)
         */
        var _cookieconsent = {};

        /**
         * Variáveis ​​de estado internas
         */
        var _saved_cookie_content;
        var consent_modal_exists = false;
        var cookie_consent_accepted = false;
        var consent_modal_visible = false;
        var settings_modal_visible = false;
        var clicked_inside_modal = false;
        var current_modal_focusable;
        
        /**
         * Salve a referência ao último elemento em foco na página
         * (usado posteriormente para restaurar o foco quando ambos os modais estão fechados)
         */
        var last_elem_before_modal;
        var last_consent_modal_btn_focus;
                             
        /**
         * Ambas as matrizes abaixo têm a mesma estrutura:
         * [0] => contém referência ao PRIMEIRO elemento focalizável dentro do modal
         * [1] => contém referência ao ÚLTIMO elemento focalizável dentro do modal
         */
        var consent_modal_focusable = [];
        var settings_modal_focusable = [];

        /**
         * Matriz de booleanos usados ​​para acompanhar as preferências ativadas/desativadas
         */
        var toggle_states = [];
        
        /**
         * Ponteiros para elementos dom principais (para evitar recuperá-los posteriormente usando document.getElementById)
         */
        var html_dom = document.documentElement;
        var main_container;
        var consent_modal;
        var settings_container, settings_inner;

        /**
         * Update config settings
         * @param {Object} conf_params 
         */
        var _setConfig = function(conf_params){
         
            _log("CookieConsent [CONFIG]: recieved_config_settings ", conf_params);

            if(typeof conf_params['cookie_expiration'] === "number"){
                _config.cookie_expiration = conf_params['cookie_expiration'];
            }

            if(typeof conf_params['autorun'] === "boolean"){
                _config.autorun = conf_params['autorun'];
            }

            if(typeof conf_params['cookie_domain'] === "string"){
                _config.cookie_domain = conf_params['cookie_domain'];
            }

            if(typeof conf_params['cookie_same_site'] === "string"){
                _config.cookie_same_site = conf_params['cookie_same_site'];
            }

            if(typeof conf_params['cookie_path'] === "string"){
                _config.cookie_path = conf_params['cookie_path'];
            }

            if(typeof conf_params['cookie_name'] === "string"){
                _config.cookie_name = conf_params['cookie_name'];
            }

            _config.page_scripts = conf_params['page_scripts'] === true;
            _config.page_scripts_order = conf_params['page_scripts_order'] !== false;

          

            if(conf_params['auto_language'] === true){
                _config.current_lang = _getValidatedLanguage(_getBrowserLang(), conf_params.languages);
            }else{
                if(typeof conf_params['current_lang'] === "string"){
                    _config.current_lang = _getValidatedLanguage(conf_params['current_lang'], conf_params.languages);;
                }
            }
     
            if(conf_params['force_consent'] === true){
                _addClass(html_dom, 'force--consent');
            }
    
            _log("CookieConsent [LANG]: setting current_lang = '"+ _config.current_lang + "'");
        }

        /**
         * Pesquise todas as ocorrências na página atual e adicione um ouvinte onClick:
         * quando clicado => abrir configurações modal
         */
        var _addCookieSettingsButtonListener = function(){
            var all_links = document.querySelectorAll('a[data-cc="c-settings"], button[data-cc="c-settings"]');
            for(var x=0; x<all_links.length; x++){
                all_links[x].setAttribute('aria-haspopup', 'dialog');
                _addEvent(all_links[x], 'click', function(event){
                    _cookieconsent.showSettings(0);
                    event.preventDefault ? event.preventDefault() : event.returnValue = false;
                });
            }
        }

        /**
         * Verifique se o idioma fornecido. índice existe como uma propriedade.
         * Se existir -> o idioma desejado é implementado,
         * caso contrário, volte para o idioma_atual padrão
         * @param {String} lang
         * @param {Object} all_languages
         */
        var _getValidatedLanguage = function(lang, all_languages){
            if(all_languages.hasOwnProperty(lang)){
                return lang;
            }else if(_getKeys(all_languages).length > 0){
                if(all_languages.hasOwnProperty(_config.current_lang)){
                    return _config.current_lang ;
                }else{
                 
                    return _getKeys(all_languages)[0];
                   
                }
            }
        }

        /**
         * Salve a referência aos primeiros e últimos elementos focalizáveis ​​dentro de cada modal
         * para evitar perder o foco ao navegar com TAB
         * @param {HTMLElement} modal_dom 
         */
        var _getModalFocusableData = function(){
         
            /**
             * Note: any of the below focusable elements, which has the attribute tabindex="-1" AND is either
             * the first or last element of the modal, won't recieve focus during "open/close" modal
             */
            var allowed_focusable_types = ['[href]', 'button', 'input', 'details', '[tabindex="0"]'];
         

            function _getAllFocusableElements(modal, _array){
                var focus_later=false, focus_first=false;
                
                // ie might throw exception due to complex unsupported selector => a:not([tabindex="-1"])
                try{  
                    var focusable_elems = modal.querySelectorAll(allowed_focusable_types.join(':not([tabindex="-1"]), '));
                    var attr, len=focusable_elems.length, i=0;
                    
                    while(i < len){
                        
                        attr = focusable_elems[i].getAttribute('data-focus');

                        if(!focus_first && attr === "1"){
                            focus_first = focusable_elems[i];
                            
                        }else if(attr === "0"){
                            focus_later = focusable_elems[i];
                            if(!focus_first && focusable_elems[i+1].getAttribute('data-focus') !== "0"){
                                focus_first = focusable_elems[i+1];
                            }
                        }

                        i++;
                    }

                }catch(e){
                    return modal.querySelectorAll(allowed_focusable_types.join(', '));
                }

                /**
                 * Salvar o primeiro e o último elemento (usado para bloquear / capturar o foco dentro do modal)
                 */
                _array[0] = focusable_elems[0];
                _array[1] = focusable_elems[focusable_elems.length - 1];
                _array[2] = focus_later;
                _array[3] = focus_first;
            }

            /**
             * Obter configurações modais de todos os elementos focalizáveis
             * Salvar o primeiro e o último elemento (usado para bloquear / capturar o foco dentro do modal)
             */
            _getAllFocusableElements(settings_inner, settings_modal_focusable);

            /**
             * Se o modal de consentimento existir, faça o mesmo
             */
          
            // if(consent_modal_exists){        
                _getAllFocusableElements(consent_modal, consent_modal_focusable);
            // }
  
        }

        /**
         * Gerar html de consentimento de cookie com base nas configurações
        */
 
        var _createCookieConsentHTML = function(never_accepted, conf_params){
         
            // Criar contêiner principal que contém o modal de consentimento e o modal de configurações
            main_container = _createNode('div');
            main_container.id = 'cc--main';

            // Corrigir layout de flash
            main_container.style.position = "fixed";
            main_container.style.zIndex = "1000000";
            main_container.innerHTML = '<!--[if lt IE 9 ]><div id="cc_div" class="cc_div ie"></div><![endif]--><!--[if (gt IE 8)|!(IE)]><!--><div id="cc_div" class="cc_div"></div><!--<![endif]-->'
            var all_modals_container = main_container.children[0];
            
            // Obtenha o idioma atual
            var lang = _config.current_lang;

            // Detecção de recurso: => evite a exceção do IE, pois .textContent nem sempre é compatível
            var innerText = (typeof html_dom.textContent === 'string' ? 'textContent' : 'innerText');
            
            // Se nunca for aceito => criar consentimento-modal
            if(!never_accepted){
               
                consent_modal = _createNode('div');
                var consent_modal_inner = _createNode('div');
                var consent_modal_inner_inner = _createNode('div');
                var consent_title = _createNode('div');
                var consent_text = _createNode('div');
                var consent_buttons = _createNode('div');
                var consent_primary_btn = _createNode('button');
                var consent_secondary_btn = _createNode('button');
                var overlay = _createNode('div');
  
                consent_modal.id = 'cm'; 
                consent_modal_inner.id = 'c-inr';
                consent_modal_inner_inner.id = 'c-inr-i';
                consent_title.id = 'c-ttl';
                consent_text.id = 'c-txt';
                consent_buttons.id = "c-bns";
                consent_primary_btn.id = 'c-p-bn';
                consent_secondary_btn.id = 'c-s-bn';
                overlay.id = 'cm-ov';
                consent_primary_btn.className =  "c-bn";
                consent_secondary_btn.className = "c-bn c_link";

                consent_title.setAttribute('role', 'heading');
                consent_title.setAttribute('aria-level', '2');
                consent_modal.setAttribute('role', 'dialog');
                consent_modal.setAttribute('aria-modal', 'true');
                consent_modal.setAttribute('aria-hidden', 'false');
                consent_modal.setAttribute('aria-labelledby', 'c-ttl');
                consent_modal.setAttribute('aria-describedby', 'c-txt');

                /**
                 * Tornar modal oculto por padrão para evitar saltos / flashes estranhos de página (mostrado apenas quando o css é carregado)
                 */
                consent_modal.style.visibility = overlay.style.visibility = "hidden";
                overlay.style.opacity = 0;

                // Use insertAdjacentHTML em vez de innerHTML
                consent_title.insertAdjacentHTML('beforeend', conf_params.languages[lang]['consent_modal']['title']);
                consent_text.insertAdjacentHTML('beforeend', conf_params.languages[lang]['consent_modal']['description']);
                
                consent_primary_btn[innerText] = conf_params.languages[lang]['consent_modal']['primary_btn']['text'];
                consent_secondary_btn[innerText] = conf_params.languages[lang]['consent_modal']['secondary_btn']['text'];

                var accept_type = -1;   // accept current selection

                if(conf_params.languages[lang]['consent_modal']['primary_btn']['role'] == 'accept_all'){
                    accept_type = 1;    // accept all
                }

                _addEvent(consent_primary_btn, "click", function(){
                    _cookieconsent.hide();  //AQUI É O AÇÃO DE SUMIR O BOTÃO
                    _log("CookieConsent [ACCEPT]: cookie_consent was accepted!");
                    _saveCookiePreferences(conf_params, accept_type);
                });

                // _addEvent(consent_secondary_btn, 'click', function(){
                //     _cookieconsent.hide();
                //       _saveCookiePreferences(conf_params, 0); // 0 => accept necessary only
                //  });

                if(conf_params.languages[lang]['consent_modal']['secondary_btn']['role'] == 'accept_necessary'){
                    _addEvent(consent_secondary_btn, 'click', function(){
                        _cookieconsent.hide();
                         _saveCookiePreferences(conf_params, 0); // 0 => accept necessary only
                     });
                 
                }else{
                    _addEvent(consent_secondary_btn, 'click', function(){
                        _cookieconsent.showSettings(0);
                    });
                }

                consent_modal_inner_inner.appendChild(consent_title);
                consent_modal_inner_inner.appendChild(consent_text);
                consent_buttons.appendChild(consent_primary_btn);
                consent_buttons.appendChild(consent_secondary_btn);
                consent_modal_inner.appendChild(consent_modal_inner_inner);
                consent_modal_inner.appendChild(consent_buttons); 
                consent_modal.appendChild(consent_modal_inner);

                // Append consent modal to main container
                all_modals_container.appendChild(consent_modal);
                all_modals_container.appendChild(overlay);
            }

            /**
             * Crie todos os elementos consent_modal
             */
            settings_container = _createNode('div');
            var settings_container_valign = _createNode('div');
            var settings = _createNode('div');
            var settings_container_inner = _createNode('div');
            settings_inner = _createNode('div');
            var settings_title = _createNode('div');
            var settings_header = _createNode('div');
            var settings_close_btn = _createNode('button');
            var settings_close_btn_container = _createNode('div');
            var settings_blocks = _createNode('div');
            var overlay = _createNode('div');
            
            /**
             * Definir ids
             */
            settings_container.id = 's-cnt';
            settings_container_valign.id = "c-vln";
            settings_container_inner.id = "c-s-in";
            settings.id = "cs";
            settings_title.id = 's-ttl';
            settings_inner.id = 's-inr';
            settings_header.id = "s-hdr";
            settings_blocks.id = 's-bl';
            settings_close_btn.id = 's-c-bn';
            overlay.id = 'cs-ov';
            settings_close_btn_container.id = 's-c-bnc';
            settings_close_btn.className = 'c-bn';

            settings_close_btn.setAttribute('aria-label', conf_params.languages[lang]['settings_modal']['close_btn_label'] || 'Close');
            settings_container.setAttribute('role', 'dialog');
            settings_container.setAttribute('aria-modal', 'true');
            settings_container.setAttribute('aria-hidden', 'true');//troquei para false
            settings_container.setAttribute('aria-labelledby', 's-ttl');
            settings_title.setAttribute('role', 'heading');
            settings_container.style.visibility = overlay.style.visibility = "hidden";
            overlay.style.opacity = 0;

            settings_close_btn_container.appendChild(settings_close_btn);
            
            // Se a tecla 'esc' for pressionada dentro de settings_container div => ocultar configurações
            _addEvent(settings_container_valign, 'keydown', function(evt){
                evt = evt || window.event;
                if (evt.keyCode == 27) {
                    _cookieconsent.hideSettings(0);
                }
            }, true);

            _addEvent(settings_close_btn, 'click', function(){
                _cookieconsent.hideSettings(0);
            });

            var all_blocks = conf_params.languages[_config.current_lang]['settings_modal']['blocks'];
            var n_blocks = all_blocks.length;

            // Definir título modal de configurações
            settings_title.insertAdjacentHTML('beforeend', conf_params.languages[_config.current_lang]['settings_modal']['title']);

            // Criar conteúdo modal de configurações (blocos)
            for(var i=0; i<n_blocks; ++i){
                
                // Criar título
                var block_section = _createNode('div');
                var block_table_container = _createNode('div');
                var block_desc = _createNode('div');
                var block_title_container = _createNode('div');

                block_section.className = 'c-bl';
                block_table_container.className = 'desc';
                block_desc.className = 'p';
                block_title_container.className = 'title';

                // Sset título e descrição para cada bloco
                block_desc.insertAdjacentHTML('beforeend', all_blocks[i]['description']);

                // Criar alternância se especificado (ativar / desativar)
                if(typeof all_blocks[i]['toggle'] !== 'undefined'){
                  
                    var accordion_id = "c-ac-"+i;

                    // Botão Criar (para recolher / expandir a descrição do bloco)
                    var block_title_btn = _createNode('button');
                    var block_switch_label = _createNode('label');
                    var block_switch = _createNode('input');
                    var block_switch_span = _createNode('span');
                    var label_text_span = _createNode('span');

                    // Estes 2 spans irão conter cada 2 pseudo-elementos para gerar os ícones 'tick' e 'x'
                    var block_switch_span_on_icon = _createNode('span');
                    var block_switch_span_off_icon = _createNode('span');

                    block_title_btn.className = 'b-tl';
                    block_switch_label.className = 'b-tg';
                    block_switch.className = 'c-tgl';
                    block_switch_span_on_icon.className = 'on-i';
                    block_switch_span_off_icon.className = 'off-i';
                    block_switch_span.className = 'c-tg';
                    label_text_span.className = "t-lb";
         
                    block_title_btn.setAttribute('aria-expanded', 'false');
                    block_title_btn.setAttribute('aria-controls', accordion_id);

                    block_switch.type = 'checkbox';
                    block_switch_span.setAttribute('aria-hidden', 'true');//troquei para false

                    var cookie_category = all_blocks[i]['toggle'].value;
                    block_switch.value = cookie_category;
  
                    label_text_span[innerText] = all_blocks[i]['title']; 
                    block_title_btn.insertAdjacentHTML('beforeend', all_blocks[i]['title']);

                    block_title_container.appendChild(block_title_btn);
                    block_switch_span.appendChild(block_switch_span_on_icon);
                    block_switch_span.appendChild(block_switch_span_off_icon);

                    /**
                     * Se nunca for aceito => gerar alterna com os estados definidos na configuração. objeto
                     * Caso contrário, recupere os valores do cookie salvo
                     */
                    setTimeout(function(){
                        $("#tags_sanviti").val(JSON.parse(_saved_cookie_content).level);
                    }, 500); 

                    if(never_accepted){
                   
                        if(_inArray(JSON.parse(_saved_cookie_content).level, cookie_category) > -1){ 
                            block_switch.checked = true;
                            toggle_states.push(true);
                        }else{
                            toggle_states.push(false);
                        }
                    }else if(all_blocks[i]['toggle']['enabled']){
                         
                        block_switch.checked = true;
                    }

                    /**
                     * Defina a alternância como somente leitura se verdadeiro (desative a caixa de seleção)
                     */
                    if(all_blocks[i]['toggle']['readonly']){
                   
                        block_switch.disabled = true;
                        block_switch.setAttribute('aria-readonly', 'true');
                    
                        _addClass(block_switch_span, 'c-ro');
                    }

                    _addClass(block_table_container, 'b-acc');
                    _addClass(block_title_container, 'b-bn');
                    _addClass(block_section, 'b-ex');

                    block_table_container.id = accordion_id;
                    block_table_container.setAttribute('aria-hidden', 'true');//troquei para false

                    block_switch_label.appendChild(block_switch);
                    block_switch_label.appendChild(block_switch_span);
                    block_switch_label.appendChild(label_text_span);
                    block_title_container.appendChild(block_switch_label);

                    /**
                     * No botão, clique em manipular o seguinte: => aria-extended, aria-hidden e act class para o bloco atual
                     */
                    (function(accordion, block_section, btn){
                      
                        _addEvent(block_title_btn, 'click', function(){                    
                            if(!_hasClass(block_section, 'act')){
                                _addClass(block_section, 'act');
                                btn.setAttribute('aria-expanded', 'true');
                                accordion.setAttribute('aria-hidden', 'false');
                            }else{
                                _removeClass(block_section, 'act');
                                btn.setAttribute('aria-expanded', 'false');
                                accordion.setAttribute('aria-hidden', 'true');//troquei para false
                            }
                        }, false);
                    })(block_table_container, block_section, block_title_btn);

                }else{
               
                    /**
                     * Se o bloco não for um botão (sem alternância definida),
                     * crie um div simples em vez disso
                     */
                    var block_title = _createNode('div');
                    block_title.className = 'b-tl';
                    block_title.setAttribute('role', 'heading');
                    block_title.setAttribute('aria-level', '3');
                    block_title.insertAdjacentHTML('beforeend', all_blocks[i]['title']);
                    block_title_container.appendChild(block_title);
                }

                block_section.appendChild(block_title_container);
                block_table_container.appendChild(block_desc);
                
                // [NEW]
                var remove_cookie_tables = conf_params['remove_cookie_tables'] === true;
              
                // se a tabela de cookies for encontrada, gere a tabela para este bloco
                if(!remove_cookie_tables && typeof all_blocks[i]['cookie_table'] !== 'undefined'){
                 
                    var tr_tmp_fragment = document.createDocumentFragment();
                    var all_table_headers = conf_params.languages[_config.current_lang]['settings_modal']['cookie_table_headers'];
                    
                    /**
                     * Usar cabecalhos de tabela personalizados
                     */
                    for(var p=0; p<all_table_headers.length; ++p){ 
              
                        // create new header
                        var th1 = _createNode('th');
                        var obj = all_table_headers[p];
                        th1.setAttribute('scope', 'col');
                       
                        // obter conteúdo de cabeçalho personalizado
                        if(obj){
                        
                            var new_column_key = obj && _getKeys(obj)[0];
                            th1[innerText] = all_table_headers[p][new_column_key];
                            tr_tmp_fragment.appendChild(th1);
                        }
                    }
              
                    var tr_tmp = _createNode('tr');
                    tr_tmp.appendChild(tr_tmp_fragment);

                    // criar cabeçalho de tabela e anexar fragmento
                    var thead = _createNode('thead');
                    thead.appendChild(tr_tmp);
                    
                    // anexar cabeçalho à tabela
                    var block_table = _createNode('table');
                    block_table.appendChild(thead);

                    var tbody_fragment = document.createDocumentFragment();
                    
                    // criar conteúdo de tabela
                    for(var n=0; n<all_blocks[i]['cookie_table'].length; n++){
                        var tr = _createNode('tr');

                        for(var g=0; g<all_table_headers.length; ++g){ 
                            // obter conteúdo de cabeçalho personalizado
                            var obj = all_table_headers[g];
                            if(obj){
                                var new_column_key = _getKeys(obj)[0];
                                
                                var td_tmp = _createNode('td');
                                
                                // Permitir html dentro das células da tabela
                                td_tmp.insertAdjacentHTML('beforeend', all_blocks[i]['cookie_table'][n][new_column_key]);
                                td_tmp.setAttribute('data-column', obj[new_column_key]);
    
                                tr.appendChild(td_tmp);
                             
                            }
                        }

                        tbody_fragment.appendChild(tr);
                    }
                    
                    // anexe tbody_fragment a tbody e anexe o último na tabela
                    var tbody = _createNode('tbody'); 
                    tbody.appendChild(tbody_fragment);
                    block_table.appendChild(tbody);

                    //block_section.appendChild(block_table);
                    block_table_container.appendChild(block_table); 
                }

                block_section.appendChild(block_table_container);
    
                // anexar bloco dentro de configurações dom
                settings_blocks.appendChild(block_section);
            }
       
            // Create settings buttons
            var settings_buttons = _createNode('div');
            var settings_save_btn = _createNode('button');
            var settings_accept_all_btn = _createNode('button');

            settings_buttons.id = 's-bns';
            settings_save_btn.id = 's-sv-bn';
            settings_accept_all_btn.id = 's-all-bn';
            settings_save_btn.className ='c-bn';
            settings_accept_all_btn.className ='c-bn';
            settings_save_btn.insertAdjacentHTML('beforeend', conf_params.languages[_config.current_lang]['settings_modal']['save_settings_btn']);
            settings_accept_all_btn.insertAdjacentHTML('beforeend', conf_params.languages[_config.current_lang]['settings_modal']['accept_all_btn']);
            settings_buttons.appendChild(settings_accept_all_btn);
            settings_buttons.appendChild(settings_save_btn);
            
            // Add save preferences button onClick event 
            // Hide both settings modal and consent modal
            _addEvent(settings_save_btn, 'click', function(){
                _cookieconsent.hideSettings();
                // _cookieconsent.hide();
                _saveCookiePreferences(conf_params, -1);
            });

            _addEvent(settings_accept_all_btn, 'click', function(){
                _cookieconsent.hideSettings();
                // _cookieconsent.hide();
                _saveCookiePreferences(conf_params, 1);
            });

            settings_header.appendChild(settings_title);
            settings_header.appendChild(settings_close_btn_container);
  
            settings_inner.appendChild(settings_header);
            settings_inner.appendChild(settings_blocks);
            settings_inner.appendChild(settings_buttons);
            settings_container_inner.appendChild(settings_inner);
        
            settings.appendChild(settings_container_inner);
            settings_container_valign.appendChild(settings);
            settings_container.appendChild(settings_container_valign);

            all_modals_container.appendChild(settings_container);
            all_modals_container.appendChild(overlay);

            // Finally append everything to body (main_container holds both modals)
            (root || document.body).appendChild(main_container);
        
        }

        /**
         * Salvar preferências de cookies
         * accept_type = 0: aceite apenas necessário
         * accept_type = 1: aceita todos
         * accept_type = -1: aceita seleção
         */
        var _saveCookiePreferences = function(conf_params, accept_type){
           
            // Obtenha todos os valores de cookiepreferences salvos no modal de configurações de cookie
            var category_toggles = document.querySelectorAll('.c-tgl') || [];
            var c_cookie_level = '', changedSettings = [], must_reload = false;

            // Se houver opções de ativação/desativação ...
            if(category_toggles.length > 0){
                switch(accept_type){
                    case -1: 
                        //aceitar a seleção atual
                        for(var i=0; i<category_toggles.length; i++){
                            if(category_toggles[i].checked){
                                c_cookie_level+='"'+category_toggles[i].value+'",';
                                if(!toggle_states[i]){
                                    changedSettings.push(category_toggles[i].value);
                                    toggle_states[i] = true;
                                }
                            }else{
                                if(toggle_states[i]){
                                    changedSettings.push(category_toggles[i].value);
                                    toggle_states[i] = false;
                                }
                            }
                        }
                        break;
                    case 0: 
                        // desabilite tudo exceto o necessário
                        for(var i=0; i<category_toggles.length; i++){
                            if(category_toggles[i].disabled){
                                c_cookie_level += '"' + category_toggles[i].value + '",';
                                toggle_states[i] = true;
                            }else{
                                category_toggles[i].checked = false;
                                if(toggle_states[i]){
                                    changedSettings.push(category_toggles[i].value);
                                    toggle_states[i] = false;
                                }
                            }
                        }
                        break;
                    case 1: 
                        // habilitar todos
                        for(var i=0; i<category_toggles.length; i++){
                            category_toggles[i].checked = true;
                            c_cookie_level += '"' + category_toggles[i].value +'",';
                            if(!toggle_states[i]){
                                changedSettings.push(category_toggles[i].value);
                            }

                            toggle_states[i] = true;
                        }
                        break;
                }

                // remova o último caractere ','
                c_cookie_level = c_cookie_level.slice(0, -1);
                
                /**
                 * Se autoclear_cookies==true -> excluir todos os cookies que não são usados ​​(com base nas preferências selecionadas)
                 */
                if(conf_params['autoclear_cookies'] && cookie_consent_accepted && changedSettings.length > 0){

                    // Obter matriz de todos os blocos definidos dentro das configurações
                    var all_blocks = conf_params.languages[_config.current_lang]['settings_modal']['blocks'];
                    
                    // Obter número de blocos
                    var len = all_blocks.length;
                    var count = -1;

                    // Recuperar todos os cookies
                    var all_cookies_array = _getCookie('', 'all');

                    // excluir cookies em 'www.domain.com' e '.www.domain.com' (também pode ser sem www)
                    var domains = [_config.cookie_domain, '.'+_config.cookie_domain];

                    // se o domínio tiver www, exclua os cookies também para 'domain.com' e '.domain.com'
                    if(_config.cookie_domain.slice(0, 4) === 'www.'){
                        var non_www_domain = _config.cookie_domain.substr(4);  // remove first 4 chars (www.)
                        domains.push(non_www_domain);
                        domains.push('.' + non_www_domain);
                    }

                    // Para cada bloco
                    for(var jk=0; jk<len; jk++){

                        // Salvar bloco atual (escopo local e menos acessos -> ~ recuperação de valor mais rápida)
                        var curr_block = all_blocks[jk];

                        // Se o bloco atual tiver uma opção para ativar/desativar
                        if(curr_block.hasOwnProperty('toggle')){
                            
                            // se o bloco atual tiver uma mesa de cookies, um botão de desligar,
                            // e suas preferências acabaram de ser alteradas => excluir cookies
                            if(
                                !toggle_states[++count] && 
                                curr_block.hasOwnProperty('cookie_table') && 
                                _inArray(changedSettings, curr_block['toggle']['value']) > -1
                            ){
                                var curr_cookie_table = curr_block['cookie_table'];

                                // Obter o primeiro nome da propriedade
                                var ckey = _getKeys(conf_params.languages[_config.current_lang]['settings_modal']['cookie_table_headers'][0])[0];
                                
                                // Obtenha o número de cookies definidos em cookie_table
                                var clen = curr_cookie_table.length;

                                // defina "must_reload" como true se reload=on_disable
                                if(curr_block['toggle']['reload'] === 'on_disable') must_reload = true;

                                // para cada linha definida na tabela de cookies
                                for(var hk=0; hk<clen; hk++){
                                    
                                    // Obtenha a linha atual da tabela (corresponde a todos os parâmetros de cookies)
                                    var curr_row = curr_cookie_table[hk], found_cookies = [];
                                    var curr_cookie_name = curr_row[ckey];
                                    var is_regex = curr_row['is_regex'] || false;
                                    var curr_cookie_domain = curr_row['domain'] || null;
                                    var curr_cookie_path = curr_row['path'] || false;

                                    //definir domínio para o domínio especificado
                                    curr_cookie_domain && ( domains = [curr_cookie_domain, '.'+curr_cookie_domain]);

                                    //Se regex fornecido => filtrar matriz de cookies
                                    if(is_regex){
                                        for(var n=0; n<all_cookies_array.length; n++){
                                            if(all_cookies_array[n].match(curr_cookie_name)){
                                                found_cookies.push(all_cookies_array[n]);
                                            }
                                        }
                                    }else{
                                        var found_index = _inArray(all_cookies_array, curr_cookie_name);
                                        if(found_index > -1) found_cookies.push(all_cookies_array[found_index]);
                                    }

                                    _log("CookieConsent [AUTOCLEAR]: search cookie: '" + curr_cookie_name + "', found:", found_cookies);
                                    
                                    // Se o cookie existir -> exclua-o
                                    if(found_cookies.length > 0){
                                        _eraseCookies(found_cookies, curr_cookie_path, domains);
                                        curr_block['toggle']['reload'] === 'on_clear' && (must_reload = true);
                                    }
                                }
                            }  
                        }
                    }
                }
            }

            _saved_cookie_content = '{"level": ['+c_cookie_level+']}';

            // salvar cookie com 'nível' de preferências (somente se nunca for aceito ou as configurações forem atualizadas)
            if(!cookie_consent_accepted || changedSettings.length > 0)
                _setCookie(_config.cookie_name, _saved_cookie_content);

            _manageExistingScripts();

            if(typeof conf_params['onAccept'] === "function" && !cookie_consent_accepted){
                cookie_consent_accepted = true; 
                return conf_params['onAccept'](JSON.parse(_saved_cookie_content));
            }

            // acionar onChange somente se as configurações foram alteradas
            if(typeof conf_params['onChange'] === "function" && changedSettings.length > 0){
                conf_params['onChange'](JSON.parse(_saved_cookie_content));
            }

            /**
             * reload page if needed
             */
            if(must_reload){
                window.location.reload();
            }
        }
  

        /**
         * Load style via ajax in background (and then show modal)
         * @param {String} css_path 
         * @param {Function} callback
         */
        var _loadCSS = function(css_path, callback){
    
            // Enable if given path is string and non empty
            var enable = typeof css_path === 'string' && css_path != "";
            
            if(enable && !document.getElementById('cc--style')){
           
                // Create style tag
                var style = _createNode('style');
                
                // ad an id so that in SPA apps (react-like) the style doesn't get loaded multiple times when plugin is called
                style.id = 'cc--style';
                
                var xhr = new XMLHttpRequest();
                
                xhr.onreadystatechange = function() {
                   // if(this.readyState == 4 && this.status == 200){
                      
                        // Necessary for <IE9
                        style.setAttribute('type', 'text/css');
                        
                        if(style.styleSheet){ // if <IE9
                         
                            style.styleSheet.cssText = this.responseText;
                        }else{ // all other browsers
                        
                            style.appendChild(document.createTextNode(this.responseText)); 
                        }

                        // Append css text content
                        document.getElementsByTagName('head')[0].appendChild(style);
                        _log("CookieConsent [AUTOLOAD_CSS]: loaded style = '"+ css_path + "'");
                      
                        callback(); 
                   // }
                };
                  
                xhr.open("GET", css_path, true);
                xhr.send(null);
            }else{
            
                callback();
            }
        }

        /**
         * Returns index of found elemet inside array, otherwise -1
         * @param {Array} arr 
         * @param {Object} value
         * @returns {Number}
         */
        var _inArray = function(arr, value){
         
            var len = arr.length;
            for(var i=0; i<len; i++){
                if(arr[i] == value)
                      
                    return i;  
            }
            return -1;
        }

        /**
         * Helper function which prints info (console.log())
         * @param {Object} print_msg 
         * @param {Object} optional_param 
         */
        var _log = function(print_msg, optional_param, error){
        
            ENABLE_LOGS && (!error ? console.log(print_msg, optional_param !== undefined ? optional_param : ' ') : console.error(print_msg, optional_param || ""));
        }

        /**
         * Helper function which creates an HTMLElement object based on 'type' and returns it.
         * @param {String} type 
         * @returns {HTMLElement}
         */
        var _createNode = function(type){
            var el = document.createElement(type);
            if(type === 'button'){
                el.setAttribute('type', type);
            }
            return el;
        }
        
        /**
         * Get current client's browser language
         * Used when 'auto_language' config property is set to 'true' (boolean)
         * @returns {String}
         */
        var _getBrowserLang = function(){
            var browser_lang = navigator.language || navigator.browserLanguage;
            browser_lang.length > 2 && (browser_lang = browser_lang[0]+browser_lang[1]);
            _log("CookieConsent [LANG]: detected_browser_lang = '"+ browser_lang + "'");
            return browser_lang.toLowerCase()
        }

        /**
         * Trap focus inside modal and focuse the first 
         * focusable element of current active modal
         */
        var _handleFocusTrap = function(){
            var tabbedOutsideDiv = false;
            var tabbedInsideModal = false;
            
            _addEvent(document, 'keydown', function(e){
                e = e || window.event;
                
                // Se é a tecla tab => ok
                if(e.key !== 'Tab') return;

                // Se houver algum modal para focar
                if(current_modal_focusable){
                    // Se atingiu o fim natural da sequência de tabulação => reiniciar
                    if(e.shiftKey){
                        if (document.activeElement === current_modal_focusable[0]) {
                            current_modal_focusable[1].focus();
                            e.preventDefault();         
                        }
                    }else{
                        if (document.activeElement === current_modal_focusable[1]) {
                            current_modal_focusable[0].focus();
                            e.preventDefault();
                        }
                    }

                    // Se ainda não usou tab (ou shift + tab) e o modal está aberto ...
                    // Focar o primeiro elemento focalizável
                    if(!tabbedInsideModal && !clicked_inside_modal){
                        tabbedInsideModal = true;
                        !tabbedOutsideDiv && e.preventDefault();

                        if(e.shiftKey){
                            if(current_modal_focusable[3]){
                                if(!current_modal_focusable[2]){
                                    current_modal_focusable[0].focus();
                                }else{
                                    current_modal_focusable[2].focus();
                                }
                            }else{
                                current_modal_focusable[1].focus();
                            }
                        }else{
                            if(current_modal_focusable[3]){
                                current_modal_focusable[3].focus();
                            }else{
                                current_modal_focusable[0].focus();
                            }
                        }
                    }
                }

                !tabbedInsideModal && (tabbedOutsideDiv = true);
            });

            if(document.contains){
                _addEvent(main_container, 'click', function(e){
                    e = e || window.event;
                    /**
                  Se o clique estiver na sobreposição de primeiro plano (e não dentro de settings_modal),
                      ocultar configurações modal
                     * 
                     * Aviso: clicar em div não é compatível com o IE
                     */
                    if(settings_modal_visible){
                        if(!settings_inner.contains(e.target)){
                            // _cookieconsent.hideSettings(0); //COMENTEI AQUI PARA O MODAL NAO FECHAR QUANDO CLICAR FORA
                            clicked_inside_modal = false;
                        }else{
                            clicked_inside_modal = true;
                        }
                    }else if(consent_modal_visible){
                        if(consent_modal.contains(e.target)){
                            clicked_inside_modal = true;
                        }
                    }
                    
                }, true);
            } 
        }

        /**
         * Manage each modal's layout
         * @param {Object} gui_options 
         */
        var _guiManager = function(gui_options){

            // If gui_options is not obje => exit
            if(typeof gui_options !== 'object') return;

            var consent_modal_options = gui_options['consent_modal'];
            var settings_modal_options = gui_options['settings_modal'];

            /**
             * Helper function which adds layout and 
             * position classes to given modal
             * 
             * @param {HTMLElement} modal 
             * @param {Array} allowed_layouts 
             * @param {Array} allowed_positions 
             * @param {String} layout 
             * @param {Array} position
             */
            function _setLayout(modal, allowed_layouts, allowed_positions, allowed_transitions, layout, position, transition){
                position = position && position.split(" ") || []; 

                // Check if specified layout is valid
                if(_inArray(allowed_layouts, layout) > -1){

                    // Add layout classe
                    _addClass(modal, layout);
                    
                    // Add position class (if specified)
                    if(_inArray(allowed_positions, position[0]) > -1){
                        for(var i=0; i<position.length; i++){
                            _addClass(modal, position[i]);
                        }
                    }
                }
                
                // Add transition class
                (_inArray(allowed_transitions, transition) > -1) && _addClass(modal, transition);
            }
            
            if(consent_modal_exists && consent_modal_options){
                _setLayout(
                    consent_modal,
                    ['box', 'bar', 'cloud'],
                    ['top', 'bottom'],
                    ['zoom', 'slide'],
                    consent_modal_options['layout'],
                    consent_modal_options['position'],
                    consent_modal_options['transition']
                );
            }

            if(settings_modal_options){
                _setLayout(
                    settings_container,
                    ['bar'],
                    ['left', 'right'],
                    ['zoom', 'slide'],
                    settings_modal_options['layout'],
                    settings_modal_options['position'],
                    settings_modal_options['transition']
                );
            }
        }
        
        /**
         * Returns true if cookie category is accepted by the user
         * @param {String} cookie_category 
         * @returns {Boolean}
         */
        _cookieconsent.allowedCategory = function(cookie_category){
            return _inArray(
                JSON.parse(_getCookie(_config.cookie_name, 'one', true) || '{}')['level'] || [] , 
                cookie_category
            ) > -1;
        }

        /**
         * 
            Verifique se o cookieconsent já está anexado ao dom
         * Caso contrário, crie um, configure-o e anexe-o ao corpo
         */
        _cookieconsent.run = function(conf_params){
            if(!main_container){
                // configure all parameters
                _setConfig(conf_params);

                // Retrieve cookie value (if set)
                _saved_cookie_content = _getCookie(_config.cookie_name, 'one', true);
                
                // If cookie is empty => create consent modal
                consent_modal_exists = _saved_cookie_content == '';

                // Generate cookie-settings dom (& consent modal)
                _createCookieConsentHTML(!consent_modal_exists, conf_params);
           
                _loadCSS(conf_params['theme_css'], function(){
               
                    // _getModalFocusableData();
                 
                    _guiManager(conf_params['gui_options']);
                  
                    _addCookieSettingsButtonListener();
                  
                  
                    if(!_saved_cookie_content && _config.autorun){     
                           
                        _cookieconsent.show(conf_params['delay']|| 0);
                    }

                    // Add class to enable animations/transitions
                    setTimeout(function(){_addClass(main_container, 'c--anim');}, 30);

                    // Accessibility :=> if tab pressed => trap focus inside modal
                    setTimeout(function(){_handleFocusTrap();}, 100);
                });

                _saved_cookie_content && (cookie_consent_accepted = true)

                // if cookie accepted => fire once the "onAccept" method (if defined)
                if(cookie_consent_accepted){
                    _manageExistingScripts();
                    if(typeof conf_params['onAccept'] === "function"){
                        conf_params['onAccept'](JSON.parse(_saved_cookie_content || "{}"));
                    }
                }
            }else{
                _log("CookieConsent [NOTICE]: cookie consent alredy attached to body!");
            }
        }

        /**
         * Mostrar configurações modais (com atraso opcional)
         * @param {Number} delay 
         */
        _cookieconsent.showSettings = function(delay){
            setTimeout(function() {
                _addClass(html_dom, "show--settings");
                settings_container.setAttribute('aria-hidden', 'false');
                settings_modal_visible = true;
                
                // Se não houver um modal de consentimento, mantenha o controle do último elemento focado.
                if(!consent_modal_visible){
                    last_elem_before_modal = document.activeElement;
                }else{
                    last_consent_modal_btn_focus = document.activeElement;
                }

                /**
                 * Defina o foco para o primeiro elemento focalizável dentro das configurações modais
                 */
                setTimeout(function(){
                    if (settings_modal_focusable.length === 0) return;

                    if(settings_modal_focusable[3]){
                        settings_modal_focusable[3].focus();
                    }else{
                        settings_modal_focusable[0].focus();
                    }
                    current_modal_focusable = settings_modal_focusable;
                }, 100);

                _log("CookieConsent [SETTINGS]: show settings_modal");
            }, delay > 0 ? delay : 0);
        }

        /**
         * Esta função lida com a lógica de carregamento / ativação do já
         * scripts existentes com base nas categorias de cookies aceitas atualmente
         */
        var _manageExistingScripts = function(){

            if(!_config.page_scripts) return;

            // obter todos os scripts com o atributo "cookie-categoria"
            var scripts = document.querySelectorAll('script[' + _config.script_selector + ']');
            var sequental_enabled = _config.page_scripts_order;
            var accepted_categories = JSON.parse(_saved_cookie_content).level || [];
            _log("CookieConsent [SCRIPT_MANAGER]: sequential loading:", sequental_enabled);

            /**
             * Load scripts (sequentally), using a recursive function
             * which loops through the scripts array
             * @param {Array} scripts scripts to load
             * @param {Number} index current script to load
             */
            var _loadScripts = function(scripts, index){
                if(index < scripts.length){

                    var curr_script = scripts[index];
                    var curr_script_category = curr_script.getAttribute(_config.script_selector);
                    
                    /**
                     * If current script's category is on the array of categories
                     * accepted by the user => load script
                     */
                    if(_inArray(accepted_categories, curr_script_category) > -1){
                        
                        curr_script.type = 'text/javascript';
                        curr_script.removeAttribute(_config.script_selector);
                        
                        // get current script data-src
                        var src = curr_script.getAttribute('data-src');
                        
                        // create fresh script (with the same code)
                        var fresh_script = _createNode('script');
                        fresh_script.textContent = curr_script.innerHTML;

                        // Copy attributes over to the new "revived" script
                        (function(destination, source){
                            var attr, attributes = source.attributes;
                            var len = attributes.length;
                            for(var i=0; i<len; i++){
                                attr = attributes[i];
                                destination.setAttribute(attr.nodeName, attr.nodeValue);
                            }
                        })(fresh_script, curr_script);
                        
                        // set src (if data-src found)
                        src ? (fresh_script.src = src) : (src = curr_script.src);

                        // if script has "src" attribute
                        // try loading it sequentially
                        if(src){
                            if(sequental_enabled){
                                // load script sequentially => the next script will not be loaded 
                                // until the current's script onload event triggers
                                if(fresh_script.readyState) {  // only required for IE <9
                                    fresh_script.onreadystatechange = function() {
                                        if (fresh_script.readyState === "loaded" || fresh_script.readyState === "complete" ) {
                                            fresh_script.onreadystatechange = null;
                                            _loadScripts(scripts, ++index);
                                        }
                                    };
                                }else{  // others
                                    fresh_script.onload = function(){
                                        fresh_script.onload = null;
                                        _loadScripts(scripts, ++index);
                                    };
                                }
                            }else{
                                // if sequential option is disabled
                                // treat current script as inline (without onload event)
                                src = false;
                            }
                        }

                        // Replace current "sleeping" script with the new "revived" one
                        curr_script.parentNode.replaceChild(fresh_script, curr_script);

                        /**
                         * If we managed to get here and scr is still set, it means that
                         * the script is loading/loaded sequentially so don't go any further
                         */
                        if(src) return;
                    }

                    // Go to next script right away
                    _loadScripts(scripts, ++index);
                }
            }

            _loadScripts(scripts, 0);
        }

        /**
         * Carregar script dinamicamente (anexar ao cabeçalho)
         * @param {String} src 
         * @param {Function} callback
         * @param {Array} attrs
         */
        _cookieconsent.loadScript = function(src, callback, attrs){

            var function_defined = typeof callback === 'function';

            // Load script only if not alredy loaded
            if(!document.querySelector('script[src="' + src + '"]')){
                
                var script = _createNode('script');
                
                // if an array is provided => add custom attributes
                if(attrs && attrs.length > 0){
                    for(var i=0; i<attrs.length; ++i){
                        attrs[i] && script.setAttribute(attrs[i]['name'], attrs[i]['value']);
                    }
                }
                
                // if callback function defined => run callback onload
                if(function_defined){
                    if(script.readyState) {  // only required for IE <9
                        script.onreadystatechange = function() {
                            if ( script.readyState === "loaded" || script.readyState === "complete" ) {
                                script.onreadystatechange = null;
                                callback();
                            }
                        };
                    }else{  //Others
                        script.onload = callback;
                    }
                }

                script.src = src;
                
                /**
                 * Append script to head
                 */
                (document.head ? document.head : document.getElementsByTagName('head')[0]).appendChild(script);
            }else{
                function_defined && callback();
            }
        }

        /**
         * Show cookie consent modal (with delay parameter)
         * @param {Number} delay 
         */
        _cookieconsent.show = function(delay){
       
            if(consent_modal_exists){
           
                setTimeout(function() {
                    _addClass(html_dom, "show--consent");

                    /**
                     * Update attributes/internal statuses
                     */
                    consent_modal.setAttribute('aria-hidden', 'false');
                    consent_modal_visible = true;
                    last_elem_before_modal = document.activeElement;
                    current_modal_focusable = consent_modal_focusable;
                    
                    _log("CookieConsent [MODAL]: show consent_modal");
                }, delay > 0 ? delay : 0);
            }
        }

        /**
         * Hide consent modal
         */
        _cookieconsent.hide = function(){ 
            if(consent_modal_exists){
                _removeClass(html_dom, "show--consent");
                consent_modal.setAttribute('aria-hidden', 'true');//troquei para false
                consent_modal_visible = false;

                //restore focus to the last page element which had focus before modal opening
                last_elem_before_modal.focus();
                current_modal_focusable = null;
                _log("CookieConsent [MODAL]: hide");
            }
        }

        /**
         * Ocultar configurações modal
         */
        _cookieconsent.hideSettings = function(){
        
            _removeClass(html_dom, "show--settings");
            settings_modal_visible = false;
            settings_container.setAttribute('aria-hidden', 'true');//troquei para false
            
            /**
             * Se o modal de consentimento estiver visível, concentre-se nele (em vez da página do documento)
             */
            if(consent_modal_visible){
                last_consent_modal_btn_focus && last_consent_modal_btn_focus.focus();
                current_modal_focusable = consent_modal_focusable;
            }else{
                /**
                 *Restaura o foco para o último elemento da página que tinha foco antes da abertura modal
                 */
                last_elem_before_modal.focus();
                current_modal_focusable = null;
            }

            clicked_inside_modal = false;
            _log("CookieConsent [SETTINGS]: hide settings_modal");
        }

        /**
         * Set cookie, by specifying name and value
         * @param {String} name 
         * @param {String} value 
         */
        var _setCookie = function(name, value) {
       
            var date = new Date();
            date.setTime(date.getTime() + (1000 * ( _config.cookie_expiration * 24 * 60 * 60)));
            var expires = "; expires=" + date.toUTCString();

            var cookieStr = name + "=" + (value || "") + expires + "; Path=" + _config.cookie_path + ";";
            cookieStr += " SameSite=" + _config.cookie_same_site + ";";

            // garante que o cookie funcione com o localhost (=> não especifique o domínio se estiver no localhost)
            if(location.hostname.indexOf(".") > -1){
                cookieStr += " Domain=" + _config.cookie_domain + ";";
            }

            if(location.protocol === "https:") {
                cookieStr += " Secure;";
            }
         
            document.cookie = cookieStr;

            _log("CookieConsent [SET_COOKIE]: cookie "+ name + "='" + value + "' was set!");
        }

        /**
         * Obtenha o valor do cookie por nome,
         * retorna o valor do cookie se encontrado (ou uma matriz
         * de cookies se o filtro for fornecido), caso contrário, string vazia: ""
         * @param {String} name 
         * @returns {String}
         */
        var _getCookie = function(name, filter, get_value) {
            var found;

            if(filter === 'one'){
                found = (found = document.cookie.match("(^|;)\\s*" + name + "\\s*=\\s*([^;]+)")) ? (get_value ? found.pop() : name) : ""
            }else if(filter === 'all'){
                // array of names of all existing cookies
                var cookies = document.cookie.split(/;\s*/); found = [];
                for(var i=0; i<cookies.length; i++){
                    found.push(cookies[i].split("=")[0]);
                }
            }

            return found;
        }

        /**
         * Delete cookie by name & path
         * @param {Array} cookies 
         * @param {String} custom_path
         * @param {Array} domains ['www.domain.com', '.www.domain.com', 'domain.com', '.domain.com']
         */
        var _eraseCookies = function(cookies, custom_path, domains) {
            var path = custom_path ? custom_path : '/';
            var expires = 'Expires=Thu, 01 Jan 1970 00:00:01 GMT;';

            for(var i=0; i<cookies.length; i++){
                for(var j=0; j<domains.length; j++){
                    document.cookie = cookies[i] +'=; Path='+ path +'; Domain=' + domains[j] + '; ' + expires;
                }
                _log("CookieConsent [AUTOCLEAR]: deleting cookie: '" + cookies[i] + "' path: '" + path + "' domain:", domains);
            }
        }

        /**
         * Retorna verdadeiro se o cookie foi encontrado e tem um valor válido (string não vazia)
         * @param {String} cookie_name
         * @returns {Boolean}
         */
        _cookieconsent.validCookie = function(cookie_name){
            return _getCookie(cookie_name, 'one', true) != "";
        }

        /**
         * Add event listener to dom object (cross browser function)
         * @param {Object} elem 
         * @param {String} event //event type
         * @param {Object } fn 
         * @param {Boolean} passive
         */
        var _addEvent = function(elem, event, fn, passive) {
            var passive = passive || false;
            
            if (elem.addEventListener) {
                passive ? elem.addEventListener(event, fn , { passive: true }) : elem.addEventListener(event, fn, false);
            } else {
                /**
                 * For old browser, add 'on' before event:
                 * 'click':=> 'onclick'
                 */
                elem.attachEvent("on" + event, fn);
            }
        }

        /**
         * Get all prop. keys defined inside object
         * @param {Object} obj 
         */
        var _getKeys = function(obj){
            if(typeof obj === "object"){
                var keys = [], i = 0;
                for (keys[i++] in obj) {};
                return keys;
            }
        }

        /**
         * Append class to the specified dom element
         * @param {HTMLElement} elem 
         * @param {String} classname 
         */
        var _addClass = function (elem, classname){
            if(elem.classList)
                elem.classList.add(classname)
            else{
                if(!_hasClass(elem, classname))
                    elem.className += ' '+classname;
            }
        }

        /**
         * Remove specified class from dom element
         * @param {HTMLElement} elem 
         * @param {String} classname 
         */
        var _removeClass = function (el, className) {
            el.classList ? el.classList.remove(className) : el.className = el.className.replace(new RegExp('(\\s|^)' + className + '(\\s|$)'), ' ');
        }

        /**
         * Check if html element has classname
         * @param {HTMLElement} el 
         * @param {String} className 
         */
        var _hasClass = function(el, className) {
            if (el.classList) {
                return el.classList.contains(className);
            }
            return !!el.className.match(new RegExp('(\\s|^)' + className + '(\\s|$)'));
        }
        
        /**
         * Antes de devolver o objeto de cookieconsent ,
         * remova a função initCookieConsent do escopo global
         * para evitar que os usuários manipulem diretamente o
         * opções de cookieconsent  no console do navegador (ou pelo menos torná-lo mais difícil)
         */
        return (CookieConsent = window[init] = undefined), _cookieconsent;
    };

    var init = 'initCookieConsent';
    /**
     * Tornar o objeto CookieConsent acessível globalmente
     */
    if(typeof window[init] !== 'function'){
        window[init] = CookieConsent
    }
})();



/*
 * CookieConsent v2 DEMO config.
*/

// obter o plugin cookieconsent
var cc = initCookieConsent();

// executar plugin com objeto de configuração
cc.run({
    
	autorun : true, 
	delay : 0,
	current_lang : 'en',
	auto_language : false,
	autoclear_cookies : true,
	cookie_expiration : 365,
    theme_css: 'https://lgpdcontrol.com.br/cookie/cookieconsent.css',
	force_consent: false,

	onAccept: function(cookie){
		console.log("onAccept fired ...");
		
		if(cc.allowedCategory('analytics')){
		
		}

		// deletar linha abaixo
		//typeof doDemoThings === 'function' && doDemoThings(cookie);
	},

	onChange: function(cookie){
		console.log("onChange fired ...");
		
		// deletar linha abaixo
		// typeof doDemoThings === 'function' && doDemoThings(cookie);
	},





	languages : {
		'en' : {	
			consent_modal : {
				title :  "Política de Privacidade",
				description :  'Utilizamos cookies para garantir que você tenha a melhor experiência em nosso site. Se você continuar a usar este site, entendemos que você aceita isso.<button type="button" data-cc="c-settings" class="cc-link">CONFIGURAR</button>',
				primary_btn: {
					text: 'Aceitar',
					role: 'accept_all'				//'accept_selected' or 'accept_all'
				},
				secondary_btn: {
					text : 'Rejeitar',
					role : 'accept_necessary'				//'settings' or 'accept_necessary'
				}
			},
			settings_modal : {
				title : '<link rel="stylesheet" href="https://www.lgpdcontrol.com.br/cookie/cookieconsent.css"></script><div>Configuração</div><div aria-hidden="true" style="font-size: .8em; font-weight: 200; color: #687278; margin-top: 5px;"></div> <button class="c-bn" style="position: relative;top:20px;width: 24.333333333333336% !important;margin-right: 5px;" id="sanviti_menu_cookies">Cookie</button> <button class="c-bn" style="position: relative;top:20px;width: 24.333333333333336% !important;" id="sanviti_menu_curriculo">Currículo</button><button class="c-bn" style="position: relative;top:20px;width: 24.333333333333336% !important;margin-right: 5px;" id="sanviti_menu_solicitacao"> Solicitação</button><button class="c-bn" style="position: relative;top:20px;width: 24.333333333333336% !important;margin-right: 5px;" id="sanviti_menu_politica"> Política</button>',
                save_settings_btn : "Aceitar Salvar configuração",
                         accept_all_btn : "Aceitar todos",
                         close_btn_label: "Close",
				cookie_table_headers : [
					{col1: "Nome" }, 
					{col2: "Dominio" }, 
                    {col4: " " }
		
				],
				blocks : [
					{
						title : '',
						description: ''
					},
                    {
        title : "Descrição de Cookie",
        description: '<p><b>O que são cookies?</b></p><p>São pequenos arquivos baixados no seu computador, para melhorar sua experiência em nosso site. Esta página descreve quais informações eles coletam, como as usamos e por que às vezes precisamos armazenar esses cookies. Também compartilharemos como você pode impedir que esses cookies sejam armazenados, no entanto, isso pode fazer o downgrade ou quebrar certos elementos da funcionalidade do site.</p><p><br></p><p><b>Como usamos os cookies?</b></p><p>Utilizamos cookies por vários motivos, detalhados abaixo. Infelizmente, na maioria dos casos, não existem opções padrão do setor para desativar os cookies sem desativar completamente a funcionalidade e os recursos que eles adicionam a este site. É recomendável que você deixe todos os cookies se não tiver certeza se precisa ou não deles, caso sejam usados para fornecer um serviço que você usa.</p>',
       
    },{
            title : "Cookies",
            description: ' ',
            toggle : {
                value : 'Cookies',
                enabled : false,
                readonly: true
            },
            cookie_table: [{
                        col1: '',
                        col2: '',                     
                        col4: ''                   
                            }
                        ]
                    },
                    {
            title : "&nbsp;&nbsp;",
            description: '<p style="text-align: center; "><b>​Bem vindo(a) à Política de Privacidade da</b></p><p style="text-align: center; "><b>PAULO DE ABREU ADMINISTRAÇÃO E CORRETAGEM DE SEGUROS LTDA</b></p><p style="text-align: center; "><span style="letter-spacing: 0.01rem;">Última atualização: Junho de 2021.</span><br></p><p style="text-align: center; "><br></p><p style="text-align: center; "><b>LEIA COM BASTANTE ATENÇÃO TODAS AS INFORMAÇÕES ABAIXO</b></p><p style="text-align: center; "><br></p><p style="text-align: center; ">Nós da PAULO DE ABREU ADMINISTRAÇÃO E CORRETAGEM DE SEGUROS LTDA, atuamos desde 1965 e acreditamos que todas as pessoas preocupadas no desenvolvimento apoiaram nosso programa de trabalho, que sintetiza agilidade, eficiência, baixo custo, confiança e atendimento personalizado.</p><p style="text-align: center; ">Assim, é imprescindível a realização da coleta de dados pessoais, permitindo, a execução do nosso serviço. A presente Política é um caminho para garantir a realização desses serviços com ética e transparência.</p><p><br></p><p><b>&nbsp; &nbsp; 1) Por que temos uma Política de Privacidade?</b></p><p>Nossa Política de Privacidade tem por objetivo estabelecer as diretrizes para a proteção de dados, o tratamento, o compartilhamento e a eliminação de dados. Aqui nós explicamos quais informações coletamos, se coletamos e por que as coletamos, além disso, explicamos como usamos essas informações, especialmente a você, titular dos dados coletados por nós, profissionais do ramo de seguros.</p><p>Como somos uma Corretora de Seguros que preza pela cultura da privacidade e proteção de dados pessoais, informamos que estamos a par da Lei Geral de Proteção de Dados Pessoais (LGPD), das boas práticas de governança em privacidade sugeridas pelos órgãos de controle e associações técnico-profissionais, e principalmente: temos o compromisso de transparência, respeitando a confiança por vocês depositada em nosso serviço.</p><p>Esta Política de Privacidade foi elaborada em conformidade com a Lei Federal nº 12.965 de 23 de abril de 2014 (Marco Civil da Internet), com a Lei Federal nº 13.709, de 14 de agosto de 2018 (Lei de Proteção de Dados Pessoais - LGPD).</p><p>Ressaltamos ainda que esta Política de Privacidade poderá ser atualizada em decorrência de eventual atualização da legislação, razão pela qual convidamos você, titular dos dados e usuário do site a consultar periodicamente esta seção.</p><p><br></p><p><b>&nbsp; &nbsp; 2) Termos utilizados (glossário):</b></p><p>Antes mesmo de adentrarmos em nossa Política, explicamos aqui alguns dos termos mais importantes para que você compreenda nossa Política de Privacidade integralmente, sendo eles:</p><p>&nbsp; &nbsp; • Titular do dado: é a pessoa natural a quem se referem os dados pessoais que são objeto de tratamento;</p><p>&nbsp; &nbsp; • Dado pessoal: trata-se da informação relacionada a pessoa natural identificada ou identificável (Exemplos: nome, RG, CPF, e-mail, endereço, etc.);</p><p>&nbsp; &nbsp; • Dado sensível: são todos os dados que, devido à sua sensibilidade natural, podem levar a questões discriminatórias em face de seu titular, sendo eles: origem racial ou étnica, convicção religiosa, opinião política, filiação a sindicato ou a organização de caráter religioso, filosófico ou político, dado referente à saúde ou à vida sexual, dado genético ou biométrico, quando vinculado a uma pessoa natural;</p><p>&nbsp; &nbsp; • Controlador: pessoa natural ou jurídica, de direito público ou privado, a quem competem as decisões referentes ao tratamento de dados pessoais;</p><p>&nbsp; &nbsp; • Operador: pessoa natural ou jurídica, de direito público ou privado, que realiza o tratamento de dados pessoais em nome do controlador;</p><p>&nbsp; &nbsp; • Agentes de tratamento: o controlador e o operador;</p><p>&nbsp; &nbsp; • Tratamento: toda operação realizada com dados pessoais, como as que se referem a coleta, produção, recepção, classificação, utilização, acesso, reprodução, transmissão, distribuição, processamento, arquivamento, armazenamento, eliminação, avaliação ou controle da informação, modificação, comunicação, transferência, difusão ou extração;</p><p>&nbsp; &nbsp; • Consentimento: manifestação livre, informada e inequívoca pela qual o titular concorda com o tratamento de seus dados pessoais para uma finalidade determinada;</p><p>&nbsp; &nbsp; • Eliminação: exclusão de dado ou de conjunto de dados armazenados em banco de dados, independentemente do procedimento empregado.</p><p>Fazemos referência à nossa Corretora de Seguros através do uso de termos tais como “site”, “nós”, “nosso”, “conosco”, palavras tais como “você”, “seu”, e expressões similares referem-se a nossos clientes, ou a usuários de nosso site e redes sociais.<br><br></p><p><b>&nbsp; &nbsp; 3) Quem somos?</b></p><p>A PAULO DE ABREU ADMINISTRAÇÃO E CORRETAGEM DE SEGUROS LTDA, atua no mercado desde 1965, nos ramos de seguro, Consórcio de Imóveis e Automóveis, Previdência, Financiamento, Cartão de Crédito, Proteção e Monitoramento, sendo um das pioneiras na região do Alto Tietê. Conta com profissionais altamente capacitados a oferecer a você a melhor opção para proteger sua vida, sua família, seu automóvel, sua residência, sua empresa, seus equipamentos, e muito mais.</p><p>Direitos dos Titulares de Dados.</p><p>Nós coletamos e tratamos todos os dados pessoais fornecidos por você. Temos o cuidado para que os dados pessoais coletados sejam estritamente necessários e adequados para atingir uma finalidade legítima, sobretudo para prestação do serviço contratado, seja este extrajudicial, judicial, ou apenas consultiva. Sendo assim, recebemos dados pessoais dos seguintes titulares:</p><p>&nbsp; &nbsp; &nbsp; &nbsp; 3.1 Clientes Pessoas Físicas para comercialização dos seguros nas esferas riscos patrimoniais, ramos elementares, produtos financeiros (consórcio e financiamento, capitalização) e pessoas (saúde, previdência, benefícios).</p><p>&nbsp; &nbsp; &nbsp; &nbsp; 3.2 Clientes Pessoas Jurídicas para comercialização dos seguros nas esferas riscos patrimoniais, ramos elementares, produtos financeiros (consórcio e financiamento, capitalização) e pessoas (saúde, previdência, benefícios).</p><p><br></p><p><b>&nbsp; &nbsp; 4) Dados e autorizações que coletamos em nosso site e nosso escritório.</b></p><p>Você não é obrigado a conceder informações para acessar nosso site. Entretanto, sem conceder certas autorizações se estas forem solicitadas (ver a seção de “cookies” presente nesta Política de Privacidade), não lhe será permitido o acesso a algumas funcionalidades do nosso site.&nbsp;</p><p>O site da PAULO DE ABREU ADMINISTRAÇÃO E CORRETAGEM DE SEGUROS LTDA coleta apenas informações de contato do usuário, caso este queira solicitar informações e eventuais cotações onde deverá informar o Nome (não necessariamente completo), o endereço de e-mail e a Mensagem com a solicitação, que será recepcionada pelo nosso escritório e direcionado a um de nossos profissionais para providências de retorno da solicitação.</p><p>Já em nossa empresa, há a coleta e tratamento dos seguintes dados:</p><p>&nbsp; &nbsp; • Dados pessoais: Nome completo, data de nascimento, CPF, RG, endereço completo, CEP, e-mail, Telefone, Cartão de Crédito, Nome do Pai, Nome da Mãe, Dados do Veículo (placa, chassi, renavam) e renda.</p><p>&nbsp; &nbsp; • Para consultas ou atendimentos simples somente pedimos dados pessoais mínimos para contato (nome, telefone, e-mail), estando livre, portanto, o titular em fornecê-los ou não.</p><p>Para contratação dos produtos oferecidos os dados são necessários e o não fornecimento impede a prestação do serviço.<br><br></p><p><b>&nbsp; &nbsp; 5) Forma de Coleta dos dados.</b></p><p>Os dados dos titulares (clientes) são coletados via formulário/Termo de Consentimento, diretamente com os profissionais (corretores) de forma presencial ou virtual (whatsapp através de formulário eletrônico e telefone).<br><br></p><p><b>&nbsp; &nbsp; 6) Como utilizamos sua informação pessoal?</b></p><p>Quando você acessar nosso site, se forem fornecidos os dados para contato, a empresa não fará uso de sua informação pessoal para outros fins senão o de retorno à solicitação enviada.&nbsp;</p><p>Em nosso escritório, presencialmente, coletamos os seus dados pessoais e realizamos o tratamento das suas informações de acordo com a seguintes finalidades específicas:</p><p>&nbsp; &nbsp; • Contratação de Seguros Patrimoniais, Autos e Residência;</p><p>&nbsp; &nbsp; • Contratação de Seguros de Benefícios, Previdência e Saúde;</p><p>&nbsp; &nbsp; • Contratação de Seguros de Responsabilidade Civil, Financeiros e Consórcios;</p><p>&nbsp; &nbsp; • Elaboração do Contrato de Venda dos Diversos Produtos acima descritos;</p><p>&nbsp; &nbsp; • Responder solicitações ou enviar informações administrativas;</p><p>&nbsp; &nbsp; • Envio de mensagens eletrônicas com informações sobre seus produtos e/ou sobre os serviços prestados;</p><p>&nbsp; &nbsp; • Envio de mensagens eletrônicas para quem teve ou possui alguma relação comercial com a empresa, sempre permitido a eliminação para tal finalidade.</p><p><br></p><p><b>&nbsp; &nbsp; 7) Fundamento legal para o tratamento dos seus dados pessoais.</b></p><p>A legislação que permite e controla esse ato é a Lei 13.709/2018, ou a Lei Geral de Proteção de Dados.</p><p>Com o advento da respectiva Lei, apenas podemos tratar seus dados pessoais para as finalidades que indicamos acima no item 7 (sete), as quais se amoldam às seguintes autorizações legais:</p><p>&nbsp; &nbsp; • Consentimento quando da finalidade orçamento relacionados ao contrato do cliente, que é o titular dos dados (inciso I do artigo 7º da Lei nº 13.709/18)</p><p>&nbsp; &nbsp; • Execução do contrato, ou de procedimentos preliminares para relacionados ao contrato do cliente, que é o titular dos dados (inciso V do artigo 7º da Lei nº 13.709/18);</p><p><br></p><p><b>&nbsp; &nbsp; 8) Compartilhamento de informações com terceiros.</b></p><p>O site da PAULO DE ABREU ADMINISTRAÇÃO E CORRETAGEM DE SEGUROS LTDA coleta apenas os dados dos visitantes que o acessam, conforme descritos no item 05 (cinco) de forma não obrigatória, bem como não repassamos ou compartilhamos nenhuma informação com terceiros.&nbsp;</p><p>Por sua vez, poderão existir links/plug-ins de acesso, não relacionados com a nossa atividade, os quais, uma vez acessados, não poderemos nos responsabilizar pela forma com que terceiros coletem, usem, protejam ou revelem as informações que você possa vir a fornecê-los através do acesso a estes links.</p><p>Ressaltamos, no entanto, que os seus dados nunca serão transferidos para terceiros sem uma autorização específica. Portanto, ao utilizá-los em plataformas de terceiros, (operadores) exigimos desses o mesmo padrão de segurança e garantias que são dadas a você.</p><p>Em relação aos dados coletados quando da finalidade orçamento/contratação de seguros/consórcios/previdência, esses após a concordância por escrito de forma livre, informada e inequívoca através do termo de consentimento, como ressalta o art. 8 da Lei nº 13.709/18 – Lei Geral de Proteção de Dados Pessoais (LGPD), são compartilhados com sistemas de cálculo/orçamento e ainda com as diversas seguradoras para atender a finalidade contratada.</p><p>A PAULO DE ABREU ADMINISTRAÇÃO E CORRETAGEM DE SEGUROS LTDA garante aos titulares dos dados os seguintes direitos, em conformidade com o artigo 18 da LGPD:</p><p>&nbsp; &nbsp; • Você poderá confirmar a existência de tratamento de dados pessoais e obter, a qualquer tempo, acesso aos seus dados;</p><p>&nbsp; &nbsp; • Caso os seus dados estejam incompletos, inexatos ou desatualizados, você pode requerer a correção desses;</p><p>&nbsp; &nbsp; • Você pode requerer informações sobre compartilhamento de dados;</p><p>&nbsp; &nbsp; • A requisição de exclusão dos seus dados pessoais tratados com o consentimento do titular, no caso os e-mails para recebimento de mensagens eletrônicas;</p><p>&nbsp; &nbsp; • Será viabilizada também a opção de portabilidade dos dados a outro prestador de serviços (corretora de seguros), mediante sua requisição e as normas previstas em nosso contrato de prestação de serviços.</p><p><br></p><p><b>&nbsp; &nbsp; 9) Uso de Cookies em nosso site:</b></p><p>Cookies são pequenos arquivos de texto inseridos no seu navegador (Chrome, Mozilla, Internet Explorer, etc.) ou dispositivo, enviados pelo site ao computador do usuário e que nele ficam armazenados, com informações relacionadas à navegação do site.</p><p>Por meio dos cookies, pequenas quantidades de informação são armazenadas pelo navegador do usuário para que a plataforma que gerencia o site possa lê-las posteriormente.</p><p>Os cookies existentes são os da plataforma que cria, disponibiliza e armazena as informações deste site, sendo por eles administrados, não tendo a PAULO DE ABREU ADMINISTRAÇÃO E CORRETAGEM DE SEGUROS LTDA qualquer acesso ou tratamento dos dados relativos aos cookies.</p><p>Os Cookies usados em nossa plataforma web tem as seguintes funções:</p><p>&nbsp; &nbsp; • Cookies estritamente necessários: essenciais para o funcionamento e operacionalização do site.</p><p>&nbsp; &nbsp; • Cookies de desempenho: Fornecem informação estatística do uso do site, ou seja, análise da web.</p><p>Os objetivos centrais para o uso de Cookies no nosso Site é aprimorar a análise de fluxo de dados, para, por exemplo, reconhecer a quantidade de acesso e o tipo de interação dos usuários com os nossos recursos, bem como possibilitar as funcionalidades do próprio site.</p><p>Através deste site, você poderá acessar o plug-in de acesso ao nosso Whatsapp. Ao acessar tal plug-in, os cookies utilizados são de sessão, que permitem que os usuários sejam reconhecidos dentro de um site e são excluídos ao sair do site ou fechar o navegador.&nbsp;</p><p>O usuário pode pesquisar junto à plataforma Whatsapp, informações sobre como seus dados pessoais são tratados.<br><br></p><p><b>&nbsp; &nbsp; 10) Segurança.</b></p><p>Nós dispomos de medidas de segurança em âmbitos físico, eletrônicos e administrativos, que protegem as suas informações. Além disso, dispomos de uma Política de Proteção de Dados para que nossos colaboradores não tenham acesso a informações pessoais, de modo que dados pessoais permaneçam sempre sem segurança.<br><br></p><p><b>&nbsp; &nbsp; 11) Mudanças nesta Declaração.</b></p><p>A presente versão desta Política de Privacidade foi atualizada pela última vez em: Junho de 2021.</p><p>Nossa empresa se reserva ao direito de modificar, a qualquer momento e sem qualquer aviso prévio, o site e as presentes normas, especialmente para adaptá-las às evoluções do site, seja pela disponibilização de novas funcionalidades, seja pela supressão ou modificação daquelas já existentes e inclusive para as mudanças que poderão ocorrer na legislação.</p><p>Dessa forma, convida-se o usuário a consultar periodicamente esta página para verificar as atualizações.</p><p>Ao acessar o site após eventuais modificações, o usuário demonstra sua concordância com as novas normas. Caso discorde de alguma das modificações, deverá interromper, imediatamente, o acesso ao site e apresentar a sua ressalva ao nosso e-mail de contato disponibilizado nesta Política de Privacidade.<br><br></p><p><b>&nbsp; &nbsp; 12) Prazo de armazenamento de dados:</b></p><p>Os dados dos clientes (vide item 4) permanecerão em nosso banco de dados até que ocorra a prescrição de eventual ação de cobrança, prestação de contas ou de responsabilidade civil, tendo como base legal, seguindo a Circular Susep 74/99 - Art. 4° O prazo mínimo, documentos originais de contratos de seguros de bens é 5 anos, contados a partir do término de vigência do contrato, ou o prazo de prescrição, o que for maior.<br><br></p><p><b>&nbsp; &nbsp; 13) Encarregado de Dados:</b></p><p>Durante o período de armazenamento na empresa a PAULO DE ABREU ADMINISTRAÇÃO E CORRETAGEM DE SEGUROS LTDA haverá um responsável exclusivo pelos dados, nos termos do art. 41 da Lei de Proteção de Dados. Esta pessoa irá responder pelos dados, caso haja necessidade de apresentá-los para autoridade competente.</p><p>Para falar com o encarregado de Proteção de Dados em nossa empresa basta entrar em contato pelo email: paulodeabreu@paulodeabreu.com.br<br><br></p><p><b>&nbsp; &nbsp; 14) Links externos.</b></p><p>Links externos não constituem endosso, pela PAULO DE ABREU ADMINISTRAÇÃO E CORRETAGEM DE SEGUROS LTDA, dos sites e ambientes vinculados, ou das informações, produtos ou serviços ali contidos, de modo que não nos responsabilizamos por danos decorrentes de conteúdos gerados por terceiros.<br><br></p><p><b>&nbsp; &nbsp; 15) Legislação e foro competentes.</b></p><p>Essa Política de Privacidade será regida, interpretada e executada de acordo com as leis da República Federativa do Brasil, sendo competente o Foro da comarca da cidade de Suzano, no Estado de São Paulo para dirimir quaisquer questões oriundas do Site da PAULO DE ABREU ADMINISTRAÇÃO E CORRETAGEM DE SEGUROS LTDA, com renúncia expressa a qualquer outro, por mais privilegiado que seja ou venha a ser.<br><br></p><p><b>&nbsp; &nbsp; 16)&nbsp; Considerações finais:</b></p><p>A PAULO DE ABREU ADMINISTRAÇÃO E CORRETAGEM DE SEGUROS LTDA respeita a sua privacidade. Quando se conectam a nós, queremos que nossos clientes saibam que seus dados pessoais estão em segurança. Assim como nós nos dedicamos em levar-lhes uma experiência virtual fácil e segura.&nbsp; Nosso esforço em atendê-los com o melhor serviço possível nunca cessa.</p><p>Ainda assim, caso você tenha ficado com alguma dúvida, entre em contato conosco através do telefone (11) 4747-4284 / 99629-8060 ou ainda pelo e-mail <b>paulodeabreu@paulodeabreu.com.br<br><br></b></p><p>Teremos prazer em ajudar no que for preciso.<br><br></p><p>Agradecemos por dispor deste valioso tempo para ler nossa Política de Privacidade!<br><br></p><div><br></div>',
          
        },

                    {
						title : "Currículo",
						description: 'Não há vagas em aberto no momento!',
                       
					},
                    {
						title : "Solicitação",
						description: '<form  id="formulario_sanviti" > <h2 style="font-size:15px">Preencha os dados para solicitação:</h2><br> <br> <select style="display: inline;padding-left:5px;background-color:white;width: 60%;height:30px;  border: 1px solid ;" id="tipo_solicitacao_sanviti" required><option value="">Selecione..</option><option value="Quero atualizar meus dados">Quero atualizar meus dados</option><option value="Quero confirmar a existência dos meus dados">Quero confirmar a existência dos meus dados</option><option value="Quero solicitar a exclusão dos meus dados">Quero solicitar a exclusão dos meus dados</option><option value="Quero solicitar a portabilidade dos meus dados">Quero solicitar a portabilidade dos meus dados</option><option value="Quero ter acesso aos meus dados pessoais">Quero ter acesso aos meus dados pessoais</option></select> <input placeholder="&nbsp;CPF" id="cpf_sanviti" style="padding-left:5px;background-color:white;width: 39%;height:30px;  border: 1px solid ;"  type="text" required="">  <br><br> <input id="nome_sanviti" style="padding-left:5px;background-color:white;width: 60%;height:30px;  border: 1px solid ;" placeholder="&nbsp;Nome completo" type="text" maxlength="50" required> <input id="telefone_sanviti" style="padding-left:5px;background-color:white;width: 39%;height:30px;  border: 1px solid ;" placeholder="&nbsp;Telefone" type="text" required><br><br><input id="email_sanviti" type="email" style="padding-left:5px;background-color:white;width: 100%;height:30px;  border: 1px solid ;" placeholder="&nbsp;E-mail" maxlength="50" required><br><br><input id="informacao_sanviti" placeholder="&nbsp;Informações adicionais" type="text" style="padding-left:5px;background-color:white;width: 100%;height:60px;border: 1px solid ;" maxlength="300" required><p>&nbsp;</p><p>Confirmação via: <input type="radio" id="sanviti_comunicao" name="sanviti_comunicao" style="appearance: auto;" value="1" required> E-mail  <input type="radio" id="sanviti_comunicao" name="sanviti_comunicao" value="2" style="appearance: auto;"> Celular</p><p>&nbsp;</p><p><input type="checkbox" style="appearance: auto;" id="lgpd_sanviti" value="1" required> Estou ciente e de acordo com o tratamento a ser realizado com os dados pessoais disponibilizados para Solicitação de Informações e cumprimento de obrigações legais, e assumo a responsabilidade e veracidade das informações digitadas neste formulário.</p><span id="msg_aceite_sanviti"></span><button id="enviar_solicitacao" type="submit" onClick="myFunction()" style="bottom:50px;z-index:100;position: fixed; left: 80%;background-color: #253b48;  border: none;color: white;padding: 10px 35px;text-decoration: none;margin: 4px 2px;cursor: pointer; border-radius: 5px;" >Enviar</button><input type="hidden" id="token_sanviti" value="6"></form>',
                       
					}
           
                
                
                    
                  
				]
			}
		},    
	},
});


var form = document.getElementById('formulario_sanviti');

var cpf_sanviti = document.getElementById('cpf_sanviti');

var nome_sanviti = document.getElementById('nome_sanviti');
var telefone_sanviti = document.getElementById('telefone_sanviti');
var email_sanviti = document.getElementById('email_sanviti');
var informacao_sanviti = document.getElementById('informacao_sanviti');
var token_sanviti = document.getElementById('token_sanviti');
var tipo_solicitacao_sanviti = document.getElementById('tipo_solicitacao_sanviti');

form.addEventListener('submit', function(e) {
    e.preventDefault();
    httpGet("https://lgpdcontrol.com.br/solicitacao.php?nome="+nome_sanviti.value+"&telefone="+telefone_sanviti.value+"&email_sanviti="+email_sanviti.value+"&informacao="+informacao_sanviti.value+"&token_sanviti="+token_sanviti.value+"&tipo_solicitacao_sanviti="+tipo_solicitacao_sanviti.value+"&cpf_sanviti="+cpf_sanviti.value+"&comunicao_sanviti="+form.elements['sanviti_comunicao'].value+" ");
    alert("Enviado com sucesso!");
    document.getElementById('nome_sanviti').value = "";
    document.getElementById('telefone_sanviti').value = "";
    document.getElementById('email_sanviti').value = "";
    document.getElementById('informacao_sanviti').value = "";
    document.getElementById('cpf_sanviti').value = "";
    
    document.getElementById('tipo_solicitacao_sanviti').value = "";
  
});









function httpGet(theUrl)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", theUrl, true ); // false for synchronous request

    xmlHttp.send( null );
    return xmlHttp.responseText;
}

    

  

function httpGet(theUrl)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", theUrl, true ); // false for synchronous request

    xmlHttp.send( null );
    return xmlHttp.responseText;
}


$(document.body).append('<input  type="hidden" style="position:fixed;" id="tags_sanviti" ><button  style="z-index: 100000;font-family:Arial;background-color:#ec101f;font-size: 12px;border-color: #000000;border-width: 1px; border-radius: 25px;position:fixed;position:fixed;width:200px;height:40px;bottom:40px;left:40px;color:#000000" aria-label="View cookie settings" data-cc="c-settings"><img src="https://lgpdcontrol.com.br/icon/cropped-ISOTIPO-32x32.png"  style="vertical-align:middle;height:20px"> <span style="vertical-align:middle;">Opções de privacidade</span></button>');










    $('.b-tg').show();
    if( $('.c-bl:eq(1) > div > div').html() == "Descrição de Cookie" || $("button[aria-controls='c-ac-1']").html() == "Descrição Cookie" || $("button[aria-controls='c-ac-1']").html() == "Cookies" || $('.c-bl:eq(1) > div > div').html()  == "Realizando uma varredura de cookies" || $("button[aria-controls='c-ac-1']").html() == "Cookie Necessários" || $("button[aria-controls='c-ac-1']").html() == "Cookie Performance" || $("button[aria-controls='c-ac-1']").html() == "Cookie Estatísticas" || $("button[aria-controls='c-ac-1']").html() == "Cookie Funcionais"  || $("button[aria-controls='c-ac-1']").html() == "Cookie Marketing" ){
        $("button[aria-controls='c-ac-1']").show();
        $("#c-ac-1").show();
        $('.c-bl:eq(1)').show();    
    }else{
        $("button[aria-controls='c-ac-1']").hide();
        $("#c-ac-1").hide();
        $('.c-bl:eq(1)').hide();
    }
    
    
    $('.b-tg').show();
    if( $('.c-bl:eq(2) > div > div').html() == "Descrição de Cookie" || $("button[aria-controls='c-ac-2']").html() == "Descrição Cookie" || $("button[aria-controls='c-ac-2']").html() == "Cookies" || $('.c-bl:eq(2) > div > div').html()  == "Realizando uma varredura de cookies" || $("button[aria-controls='c-ac-2']").html() == "Cookie Necessários" || $("button[aria-controls='c-ac-2']").html() == "Cookie Performance" || $("button[aria-controls='c-ac-2']").html() == "Cookie Estatísticas" || $("button[aria-controls='c-ac-2']").html() == "Cookie Funcionais"  || $("button[aria-controls='c-ac-2']").html() == "Cookie Marketing" ){
        $("button[aria-controls='c-ac-2']").show();
        $("#c-ac-2").show();
        $('.c-bl:eq(2)').show();    
    }else{
        $("button[aria-controls='c-ac-2']").hide();
        $("#c-ac-2").hide();
        $('.c-bl:eq(2)').hide();
    }
    
    
    $('.b-tg').show();
    if( $('.c-bl:eq(3) > div > div').html() == "Descrição de Cookie" || $("button[aria-controls='c-ac-3']").html() == "Descrição Cookie" || $("button[aria-controls='c-ac-3']").html() == "Cookies" || $('.c-bl:eq(3) > div > div').html()  == "Realizando uma varredura de cookies" || $("button[aria-controls='c-ac-3']").html() == "Cookie Necessários" || $("button[aria-controls='c-ac-3']").html() == "Cookie Performance" || $("button[aria-controls='c-ac-3']").html() == "Cookie Estatísticas" || $("button[aria-controls='c-ac-3']").html() == "Cookie Funcionais"  || $("button[aria-controls='c-ac-3']").html() == "Cookie Marketing" ){
        $("button[aria-controls='c-ac-3']").show();
        $("#c-ac-3").show();
        $('.c-bl:eq(3)').show();    
    }else{
        $("button[aria-controls='c-ac-3']").hide();
        $("#c-ac-3").hide();
        $('.c-bl:eq(3)').hide();
    }
    
    
    $('.b-tg').show();
    if( $('.c-bl:eq(4) > div > div').html() == "Descrição de Cookie" || $("button[aria-controls='c-ac-4']").html() == "Descrição Cookie" || $("button[aria-controls='c-ac-4']").html() == "Cookies" || $('.c-bl:eq(4) > div > div').html()  == "Realizando uma varredura de cookies" || $("button[aria-controls='c-ac-4']").html() == "Cookie Necessários" || $("button[aria-controls='c-ac-4']").html() == "Cookie Performance" || $("button[aria-controls='c-ac-4']").html() == "Cookie Estatísticas" || $("button[aria-controls='c-ac-4']").html() == "Cookie Funcionais"  || $("button[aria-controls='c-ac-4']").html() == "Cookie Marketing" ){
        $("button[aria-controls='c-ac-4']").show();
        $("#c-ac-4").show();
        $('.c-bl:eq(4)').show();    
    }else{
        $("button[aria-controls='c-ac-4']").hide();
        $("#c-ac-4").hide();
        $('.c-bl:eq(4)').hide();
    }
    
    
    $('.b-tg').show();
    if( $('.c-bl:eq(5) > div > div').html() == "Descrição de Cookie" || $("button[aria-controls='c-ac-5']").html() == "Descrição Cookie" || $("button[aria-controls='c-ac-5']").html() == "Cookies" || $('.c-bl:eq(5) > div > div').html()  == "Realizando uma varredura de cookies" || $("button[aria-controls='c-ac-5']").html() == "Cookie Necessários" || $("button[aria-controls='c-ac-5']").html() == "Cookie Performance" || $("button[aria-controls='c-ac-5']").html() == "Cookie Estatísticas" || $("button[aria-controls='c-ac-5']").html() == "Cookie Funcionais"  || $("button[aria-controls='c-ac-5']").html() == "Cookie Marketing" ){
        $("button[aria-controls='c-ac-5']").show();
        $("#c-ac-5").show();
        $('.c-bl:eq(5)').show();    
    }else{
        $("button[aria-controls='c-ac-5']").hide();
        $("#c-ac-5").hide();
        $('.c-bl:eq(5)').hide();
    }
    
    
    $('.b-tg').show();
    if( $('.c-bl:eq(6) > div > div').html() == "Descrição de Cookie" || $("button[aria-controls='c-ac-6']").html() == "Descrição Cookie" || $("button[aria-controls='c-ac-6']").html() == "Cookies" || $('.c-bl:eq(6) > div > div').html()  == "Realizando uma varredura de cookies" || $("button[aria-controls='c-ac-6']").html() == "Cookie Necessários" || $("button[aria-controls='c-ac-6']").html() == "Cookie Performance" || $("button[aria-controls='c-ac-6']").html() == "Cookie Estatísticas" || $("button[aria-controls='c-ac-6']").html() == "Cookie Funcionais"  || $("button[aria-controls='c-ac-6']").html() == "Cookie Marketing" ){
        $("button[aria-controls='c-ac-6']").show();
        $("#c-ac-6").show();
        $('.c-bl:eq(6)').show();    
    }else{
        $("button[aria-controls='c-ac-6']").hide();
        $("#c-ac-6").hide();
        $('.c-bl:eq(6)').hide();
    }
    
    
    $('.b-tg').show();
    if( $('.c-bl:eq(7) > div > div').html() == "Descrição de Cookie" || $("button[aria-controls='c-ac-7']").html() == "Descrição Cookie" || $("button[aria-controls='c-ac-7']").html() == "Cookies" || $('.c-bl:eq(7) > div > div').html()  == "Realizando uma varredura de cookies" || $("button[aria-controls='c-ac-7']").html() == "Cookie Necessários" || $("button[aria-controls='c-ac-7']").html() == "Cookie Performance" || $("button[aria-controls='c-ac-7']").html() == "Cookie Estatísticas" || $("button[aria-controls='c-ac-7']").html() == "Cookie Funcionais"  || $("button[aria-controls='c-ac-7']").html() == "Cookie Marketing" ){
        $("button[aria-controls='c-ac-7']").show();
        $("#c-ac-7").show();
        $('.c-bl:eq(7)').show();    
    }else{
        $("button[aria-controls='c-ac-7']").hide();
        $("#c-ac-7").hide();
        $('.c-bl:eq(7)').hide();
    }
    
    
    $('.b-tg').show();
    if( $('.c-bl:eq(8) > div > div').html() == "Descrição de Cookie" || $("button[aria-controls='c-ac-8']").html() == "Descrição Cookie" || $("button[aria-controls='c-ac-8']").html() == "Cookies" || $('.c-bl:eq(8) > div > div').html()  == "Realizando uma varredura de cookies" || $("button[aria-controls='c-ac-8']").html() == "Cookie Necessários" || $("button[aria-controls='c-ac-8']").html() == "Cookie Performance" || $("button[aria-controls='c-ac-8']").html() == "Cookie Estatísticas" || $("button[aria-controls='c-ac-8']").html() == "Cookie Funcionais"  || $("button[aria-controls='c-ac-8']").html() == "Cookie Marketing" ){
        $("button[aria-controls='c-ac-8']").show();
        $("#c-ac-8").show();
        $('.c-bl:eq(8)').show();    
    }else{
        $("button[aria-controls='c-ac-8']").hide();
        $("#c-ac-8").hide();
        $('.c-bl:eq(8)').hide();
    }
    
    
    $('.b-tg').show();
    if( $('.c-bl:eq(9) > div > div').html() == "Descrição de Cookie" || $("button[aria-controls='c-ac-9']").html() == "Descrição Cookie" || $("button[aria-controls='c-ac-9']").html() == "Cookies" || $('.c-bl:eq(9) > div > div').html()  == "Realizando uma varredura de cookies" || $("button[aria-controls='c-ac-9']").html() == "Cookie Necessários" || $("button[aria-controls='c-ac-9']").html() == "Cookie Performance" || $("button[aria-controls='c-ac-9']").html() == "Cookie Estatísticas" || $("button[aria-controls='c-ac-9']").html() == "Cookie Funcionais"  || $("button[aria-controls='c-ac-9']").html() == "Cookie Marketing" ){
        $("button[aria-controls='c-ac-9']").show();
        $("#c-ac-9").show();
        $('.c-bl:eq(9)').show();    
    }else{
        $("button[aria-controls='c-ac-9']").hide();
        $("#c-ac-9").hide();
        $('.c-bl:eq(9)').hide();
    }
    
    
    $('.b-tg').show();
    if( $('.c-bl:eq(10) > div > div').html() == "Descrição de Cookie" || $("button[aria-controls='c-ac-10']").html() == "Descrição Cookie" || $("button[aria-controls='c-ac-10']").html() == "Cookies" || $('.c-bl:eq(10) > div > div').html()  == "Realizando uma varredura de cookies" || $("button[aria-controls='c-ac-10']").html() == "Cookie Necessários" || $("button[aria-controls='c-ac-10']").html() == "Cookie Performance" || $("button[aria-controls='c-ac-10']").html() == "Cookie Estatísticas" || $("button[aria-controls='c-ac-10']").html() == "Cookie Funcionais"  || $("button[aria-controls='c-ac-10']").html() == "Cookie Marketing" ){
        $("button[aria-controls='c-ac-10']").show();
        $("#c-ac-10").show();
        $('.c-bl:eq(10)').show();    
    }else{
        $("button[aria-controls='c-ac-10']").hide();
        $("#c-ac-10").hide();
        $('.c-bl:eq(10)').hide();
    }
    
    
//-----------------------cookie

    $("#sanviti_menu_cookies").click(function(){    
        $('.b-tg').show();
        if( $('.c-bl:eq(1) > div > div').html() == "Descrição de Cookie" || $("button[aria-controls='c-ac-1']").html() == "Descrição Cookie" || $("button[aria-controls='c-ac-1']").html() == "Cookies" || $('.c-bl:eq(1) > div > div').html()  == "Realizando uma varredura de cookies" || $("button[aria-controls='c-ac-1']").html() == "Cookie Necessários" || $("button[aria-controls='c-ac-1']").html() == "Cookie Performance" || $("button[aria-controls='c-ac-1']").html() == "Cookie Estatísticas" || $("button[aria-controls='c-ac-1']").html() == "Cookie Funcionais"  || $("button[aria-controls='c-ac-1']").html() == "Cookie Marketing" ){
            $("button[aria-controls='c-ac-1']").show();
            $("#c-ac-1").show();
            $('.c-bl:eq(1)').show();   
            $("#s-all-bn").show();
            $("#s-sv-bn").show(); 
        }else{
            $("button[aria-controls='c-ac-1']").hide();
            $("#c-ac-1").hide();
            $('.c-bl:eq(1)').hide();
        }
        
    });

    
    $("#sanviti_menu_cookies").click(function(){    
        $('.b-tg').show();
        if( $('.c-bl:eq(2) > div > div').html() == "Descrição de Cookie" || $("button[aria-controls='c-ac-2']").html() == "Descrição Cookie" || $("button[aria-controls='c-ac-2']").html() == "Cookies" || $('.c-bl:eq(2) > div > div').html()  == "Realizando uma varredura de cookies" || $("button[aria-controls='c-ac-2']").html() == "Cookie Necessários" || $("button[aria-controls='c-ac-2']").html() == "Cookie Performance" || $("button[aria-controls='c-ac-2']").html() == "Cookie Estatísticas" || $("button[aria-controls='c-ac-2']").html() == "Cookie Funcionais"  || $("button[aria-controls='c-ac-2']").html() == "Cookie Marketing" ){
            $("button[aria-controls='c-ac-2']").show();
            $("#c-ac-2").show();
            $('.c-bl:eq(2)').show();   
            $("#s-all-bn").show();
            $("#s-sv-bn").show(); 
        }else{
            $("button[aria-controls='c-ac-2']").hide();
            $("#c-ac-2").hide();
            $('.c-bl:eq(2)').hide();
        }
        
    });

    
    $("#sanviti_menu_cookies").click(function(){    
        $('.b-tg').show();
        if( $('.c-bl:eq(3) > div > div').html() == "Descrição de Cookie" || $("button[aria-controls='c-ac-3']").html() == "Descrição Cookie" || $("button[aria-controls='c-ac-3']").html() == "Cookies" || $('.c-bl:eq(3) > div > div').html()  == "Realizando uma varredura de cookies" || $("button[aria-controls='c-ac-3']").html() == "Cookie Necessários" || $("button[aria-controls='c-ac-3']").html() == "Cookie Performance" || $("button[aria-controls='c-ac-3']").html() == "Cookie Estatísticas" || $("button[aria-controls='c-ac-3']").html() == "Cookie Funcionais"  || $("button[aria-controls='c-ac-3']").html() == "Cookie Marketing" ){
            $("button[aria-controls='c-ac-3']").show();
            $("#c-ac-3").show();
            $('.c-bl:eq(3)').show();   
            $("#s-all-bn").show();
            $("#s-sv-bn").show(); 
        }else{
            $("button[aria-controls='c-ac-3']").hide();
            $("#c-ac-3").hide();
            $('.c-bl:eq(3)').hide();
        }
        
    });

    
    $("#sanviti_menu_cookies").click(function(){    
        $('.b-tg').show();
        if( $('.c-bl:eq(4) > div > div').html() == "Descrição de Cookie" || $("button[aria-controls='c-ac-4']").html() == "Descrição Cookie" || $("button[aria-controls='c-ac-4']").html() == "Cookies" || $('.c-bl:eq(4) > div > div').html()  == "Realizando uma varredura de cookies" || $("button[aria-controls='c-ac-4']").html() == "Cookie Necessários" || $("button[aria-controls='c-ac-4']").html() == "Cookie Performance" || $("button[aria-controls='c-ac-4']").html() == "Cookie Estatísticas" || $("button[aria-controls='c-ac-4']").html() == "Cookie Funcionais"  || $("button[aria-controls='c-ac-4']").html() == "Cookie Marketing" ){
            $("button[aria-controls='c-ac-4']").show();
            $("#c-ac-4").show();
            $('.c-bl:eq(4)').show();   
            $("#s-all-bn").show();
            $("#s-sv-bn").show(); 
        }else{
            $("button[aria-controls='c-ac-4']").hide();
            $("#c-ac-4").hide();
            $('.c-bl:eq(4)').hide();
        }
        
    });

    
    $("#sanviti_menu_cookies").click(function(){    
        $('.b-tg').show();
        if( $('.c-bl:eq(5) > div > div').html() == "Descrição de Cookie" || $("button[aria-controls='c-ac-5']").html() == "Descrição Cookie" || $("button[aria-controls='c-ac-5']").html() == "Cookies" || $('.c-bl:eq(5) > div > div').html()  == "Realizando uma varredura de cookies" || $("button[aria-controls='c-ac-5']").html() == "Cookie Necessários" || $("button[aria-controls='c-ac-5']").html() == "Cookie Performance" || $("button[aria-controls='c-ac-5']").html() == "Cookie Estatísticas" || $("button[aria-controls='c-ac-5']").html() == "Cookie Funcionais"  || $("button[aria-controls='c-ac-5']").html() == "Cookie Marketing" ){
            $("button[aria-controls='c-ac-5']").show();
            $("#c-ac-5").show();
            $('.c-bl:eq(5)').show();   
            $("#s-all-bn").show();
            $("#s-sv-bn").show(); 
        }else{
            $("button[aria-controls='c-ac-5']").hide();
            $("#c-ac-5").hide();
            $('.c-bl:eq(5)').hide();
        }
        
    });

    
    $("#sanviti_menu_cookies").click(function(){    
        $('.b-tg').show();
        if( $('.c-bl:eq(6) > div > div').html() == "Descrição de Cookie" || $("button[aria-controls='c-ac-6']").html() == "Descrição Cookie" || $("button[aria-controls='c-ac-6']").html() == "Cookies" || $('.c-bl:eq(6) > div > div').html()  == "Realizando uma varredura de cookies" || $("button[aria-controls='c-ac-6']").html() == "Cookie Necessários" || $("button[aria-controls='c-ac-6']").html() == "Cookie Performance" || $("button[aria-controls='c-ac-6']").html() == "Cookie Estatísticas" || $("button[aria-controls='c-ac-6']").html() == "Cookie Funcionais"  || $("button[aria-controls='c-ac-6']").html() == "Cookie Marketing" ){
            $("button[aria-controls='c-ac-6']").show();
            $("#c-ac-6").show();
            $('.c-bl:eq(6)').show();   
            $("#s-all-bn").show();
            $("#s-sv-bn").show(); 
        }else{
            $("button[aria-controls='c-ac-6']").hide();
            $("#c-ac-6").hide();
            $('.c-bl:eq(6)').hide();
        }
        
    });

    
    $("#sanviti_menu_cookies").click(function(){    
        $('.b-tg').show();
        if( $('.c-bl:eq(7) > div > div').html() == "Descrição de Cookie" || $("button[aria-controls='c-ac-7']").html() == "Descrição Cookie" || $("button[aria-controls='c-ac-7']").html() == "Cookies" || $('.c-bl:eq(7) > div > div').html()  == "Realizando uma varredura de cookies" || $("button[aria-controls='c-ac-7']").html() == "Cookie Necessários" || $("button[aria-controls='c-ac-7']").html() == "Cookie Performance" || $("button[aria-controls='c-ac-7']").html() == "Cookie Estatísticas" || $("button[aria-controls='c-ac-7']").html() == "Cookie Funcionais"  || $("button[aria-controls='c-ac-7']").html() == "Cookie Marketing" ){
            $("button[aria-controls='c-ac-7']").show();
            $("#c-ac-7").show();
            $('.c-bl:eq(7)').show();   
            $("#s-all-bn").show();
            $("#s-sv-bn").show(); 
        }else{
            $("button[aria-controls='c-ac-7']").hide();
            $("#c-ac-7").hide();
            $('.c-bl:eq(7)').hide();
        }
        
    });

    
    $("#sanviti_menu_cookies").click(function(){    
        $('.b-tg').show();
        if( $('.c-bl:eq(8) > div > div').html() == "Descrição de Cookie" || $("button[aria-controls='c-ac-8']").html() == "Descrição Cookie" || $("button[aria-controls='c-ac-8']").html() == "Cookies" || $('.c-bl:eq(8) > div > div').html()  == "Realizando uma varredura de cookies" || $("button[aria-controls='c-ac-8']").html() == "Cookie Necessários" || $("button[aria-controls='c-ac-8']").html() == "Cookie Performance" || $("button[aria-controls='c-ac-8']").html() == "Cookie Estatísticas" || $("button[aria-controls='c-ac-8']").html() == "Cookie Funcionais"  || $("button[aria-controls='c-ac-8']").html() == "Cookie Marketing" ){
            $("button[aria-controls='c-ac-8']").show();
            $("#c-ac-8").show();
            $('.c-bl:eq(8)').show();   
            $("#s-all-bn").show();
            $("#s-sv-bn").show(); 
        }else{
            $("button[aria-controls='c-ac-8']").hide();
            $("#c-ac-8").hide();
            $('.c-bl:eq(8)').hide();
        }
        
    });

    
    $("#sanviti_menu_cookies").click(function(){    
        $('.b-tg').show();
        if( $('.c-bl:eq(9) > div > div').html() == "Descrição de Cookie" || $("button[aria-controls='c-ac-9']").html() == "Descrição Cookie" || $("button[aria-controls='c-ac-9']").html() == "Cookies" || $('.c-bl:eq(9) > div > div').html()  == "Realizando uma varredura de cookies" || $("button[aria-controls='c-ac-9']").html() == "Cookie Necessários" || $("button[aria-controls='c-ac-9']").html() == "Cookie Performance" || $("button[aria-controls='c-ac-9']").html() == "Cookie Estatísticas" || $("button[aria-controls='c-ac-9']").html() == "Cookie Funcionais"  || $("button[aria-controls='c-ac-9']").html() == "Cookie Marketing" ){
            $("button[aria-controls='c-ac-9']").show();
            $("#c-ac-9").show();
            $('.c-bl:eq(9)').show();   
            $("#s-all-bn").show();
            $("#s-sv-bn").show(); 
        }else{
            $("button[aria-controls='c-ac-9']").hide();
            $("#c-ac-9").hide();
            $('.c-bl:eq(9)').hide();
        }
        
    });

    
    $("#sanviti_menu_cookies").click(function(){    
        $('.b-tg').show();
        if( $('.c-bl:eq(10) > div > div').html() == "Descrição de Cookie" || $("button[aria-controls='c-ac-10']").html() == "Descrição Cookie" || $("button[aria-controls='c-ac-10']").html() == "Cookies" || $('.c-bl:eq(10) > div > div').html()  == "Realizando uma varredura de cookies" || $("button[aria-controls='c-ac-10']").html() == "Cookie Necessários" || $("button[aria-controls='c-ac-10']").html() == "Cookie Performance" || $("button[aria-controls='c-ac-10']").html() == "Cookie Estatísticas" || $("button[aria-controls='c-ac-10']").html() == "Cookie Funcionais"  || $("button[aria-controls='c-ac-10']").html() == "Cookie Marketing" ){
            $("button[aria-controls='c-ac-10']").show();
            $("#c-ac-10").show();
            $('.c-bl:eq(10)').show();   
            $("#s-all-bn").show();
            $("#s-sv-bn").show(); 
        }else{
            $("button[aria-controls='c-ac-10']").hide();
            $("#c-ac-10").hide();
            $('.c-bl:eq(10)').hide();
        }
        
    });

    
//-----------------POLITICA

    $("#sanviti_menu_politica").click(function(){  
        $('.b-tg').hide();
        if($('.c-bl:eq(1) > div > div').html() == "&nbsp;&nbsp;"){

            $("button[aria-controls='c-ac-1']").show();  
            $("#c-ac-1").show();  
            $('.c-bl:eq(1)').show();   
            $("#s-all-bn").hide();
            $("#s-sv-bn").hide();     
                  
        }else{
            $("button[aria-controls='c-ac-1']").hide();
            $("#c-ac-1").hide();
            $('.c-bl:eq(1)').hide();
        }
    });
    
    $("#sanviti_menu_politica").click(function(){  
        $('.b-tg').hide();
        if($('.c-bl:eq(2) > div > div').html() == "&nbsp;&nbsp;"){

            $("button[aria-controls='c-ac-2']").show();  
            $("#c-ac-2").show();  
            $('.c-bl:eq(2)').show();   
            $("#s-all-bn").hide();
            $("#s-sv-bn").hide();     
                  
        }else{
            $("button[aria-controls='c-ac-2']").hide();
            $("#c-ac-2").hide();
            $('.c-bl:eq(2)').hide();
        }
    });
    
    $("#sanviti_menu_politica").click(function(){  
        $('.b-tg').hide();
        if($('.c-bl:eq(3) > div > div').html() == "&nbsp;&nbsp;"){

            $("button[aria-controls='c-ac-3']").show();  
            $("#c-ac-3").show();  
            $('.c-bl:eq(3)').show();   
            $("#s-all-bn").hide();
            $("#s-sv-bn").hide();     
                  
        }else{
            $("button[aria-controls='c-ac-3']").hide();
            $("#c-ac-3").hide();
            $('.c-bl:eq(3)').hide();
        }
    });
    
    $("#sanviti_menu_politica").click(function(){  
        $('.b-tg').hide();
        if($('.c-bl:eq(4) > div > div').html() == "&nbsp;&nbsp;"){

            $("button[aria-controls='c-ac-4']").show();  
            $("#c-ac-4").show();  
            $('.c-bl:eq(4)').show();   
            $("#s-all-bn").hide();
            $("#s-sv-bn").hide();     
                  
        }else{
            $("button[aria-controls='c-ac-4']").hide();
            $("#c-ac-4").hide();
            $('.c-bl:eq(4)').hide();
        }
    });
    
    $("#sanviti_menu_politica").click(function(){  
        $('.b-tg').hide();
        if($('.c-bl:eq(5) > div > div').html() == "&nbsp;&nbsp;"){

            $("button[aria-controls='c-ac-5']").show();  
            $("#c-ac-5").show();  
            $('.c-bl:eq(5)').show();   
            $("#s-all-bn").hide();
            $("#s-sv-bn").hide();     
                  
        }else{
            $("button[aria-controls='c-ac-5']").hide();
            $("#c-ac-5").hide();
            $('.c-bl:eq(5)').hide();
        }
    });
    
    $("#sanviti_menu_politica").click(function(){  
        $('.b-tg').hide();
        if($('.c-bl:eq(6) > div > div').html() == "&nbsp;&nbsp;"){

            $("button[aria-controls='c-ac-6']").show();  
            $("#c-ac-6").show();  
            $('.c-bl:eq(6)').show();   
            $("#s-all-bn").hide();
            $("#s-sv-bn").hide();     
                  
        }else{
            $("button[aria-controls='c-ac-6']").hide();
            $("#c-ac-6").hide();
            $('.c-bl:eq(6)').hide();
        }
    });
    
    $("#sanviti_menu_politica").click(function(){  
        $('.b-tg').hide();
        if($('.c-bl:eq(7) > div > div').html() == "&nbsp;&nbsp;"){

            $("button[aria-controls='c-ac-7']").show();  
            $("#c-ac-7").show();  
            $('.c-bl:eq(7)').show();   
            $("#s-all-bn").hide();
            $("#s-sv-bn").hide();     
                  
        }else{
            $("button[aria-controls='c-ac-7']").hide();
            $("#c-ac-7").hide();
            $('.c-bl:eq(7)').hide();
        }
    });
    
    $("#sanviti_menu_politica").click(function(){  
        $('.b-tg').hide();
        if($('.c-bl:eq(8) > div > div').html() == "&nbsp;&nbsp;"){

            $("button[aria-controls='c-ac-8']").show();  
            $("#c-ac-8").show();  
            $('.c-bl:eq(8)').show();   
            $("#s-all-bn").hide();
            $("#s-sv-bn").hide();     
                  
        }else{
            $("button[aria-controls='c-ac-8']").hide();
            $("#c-ac-8").hide();
            $('.c-bl:eq(8)').hide();
        }
    });
    
    $("#sanviti_menu_politica").click(function(){  
        $('.b-tg').hide();
        if($('.c-bl:eq(9) > div > div').html() == "&nbsp;&nbsp;"){

            $("button[aria-controls='c-ac-9']").show();  
            $("#c-ac-9").show();  
            $('.c-bl:eq(9)').show();   
            $("#s-all-bn").hide();
            $("#s-sv-bn").hide();     
                  
        }else{
            $("button[aria-controls='c-ac-9']").hide();
            $("#c-ac-9").hide();
            $('.c-bl:eq(9)').hide();
        }
    });
    
    $("#sanviti_menu_politica").click(function(){  
        $('.b-tg').hide();
        if($('.c-bl:eq(10) > div > div').html() == "&nbsp;&nbsp;"){

            $("button[aria-controls='c-ac-10']").show();  
            $("#c-ac-10").show();  
            $('.c-bl:eq(10)').show();   
            $("#s-all-bn").hide();
            $("#s-sv-bn").hide();     
                  
        }else{
            $("button[aria-controls='c-ac-10']").hide();
            $("#c-ac-10").hide();
            $('.c-bl:eq(10)').hide();
        }
    });
    
//----Solicitacao

    
    $("#sanviti_menu_solicitacao").click(function(){
        $('.b-tg').hide();
        if($('.c-bl:eq(1) > div > div').html() == "Solicitação"){
            $("button[aria-controls='c-ac-1']").show();  
            $("#c-ac-1").show();  
            $('.c-bl:eq(1)').show();
            $("#s-all-bn").hide();
            $("#s-sv-bn").hide();
            

        }else{
            $("button[aria-controls='c-ac-1']").hide();
            $("#c-ac-1").hide();
            $('.c-bl:eq(1)').hide();
        }

    });
 
    
    
    
    $("#sanviti_menu_solicitacao").click(function(){
        $('.b-tg').hide();
        if($('.c-bl:eq(2) > div > div').html() == "Solicitação"){
            $("button[aria-controls='c-ac-2']").show();  
            $("#c-ac-2").show();  
            $('.c-bl:eq(2)').show();
            $("#s-all-bn").hide();
            $("#s-sv-bn").hide();
            

        }else{
            $("button[aria-controls='c-ac-2']").hide();
            $("#c-ac-2").hide();
            $('.c-bl:eq(2)').hide();
        }

    });
 
    
    
    
    $("#sanviti_menu_solicitacao").click(function(){
        $('.b-tg').hide();
        if($('.c-bl:eq(3) > div > div').html() == "Solicitação"){
            $("button[aria-controls='c-ac-3']").show();  
            $("#c-ac-3").show();  
            $('.c-bl:eq(3)').show();
            $("#s-all-bn").hide();
            $("#s-sv-bn").hide();
            

        }else{
            $("button[aria-controls='c-ac-3']").hide();
            $("#c-ac-3").hide();
            $('.c-bl:eq(3)').hide();
        }

    });
 
    
    
    
    $("#sanviti_menu_solicitacao").click(function(){
        $('.b-tg').hide();
        if($('.c-bl:eq(4) > div > div').html() == "Solicitação"){
            $("button[aria-controls='c-ac-4']").show();  
            $("#c-ac-4").show();  
            $('.c-bl:eq(4)').show();
            $("#s-all-bn").hide();
            $("#s-sv-bn").hide();
            

        }else{
            $("button[aria-controls='c-ac-4']").hide();
            $("#c-ac-4").hide();
            $('.c-bl:eq(4)').hide();
        }

    });
 
    
    
    
    $("#sanviti_menu_solicitacao").click(function(){
        $('.b-tg').hide();
        if($('.c-bl:eq(5) > div > div').html() == "Solicitação"){
            $("button[aria-controls='c-ac-5']").show();  
            $("#c-ac-5").show();  
            $('.c-bl:eq(5)').show();
            $("#s-all-bn").hide();
            $("#s-sv-bn").hide();
            

        }else{
            $("button[aria-controls='c-ac-5']").hide();
            $("#c-ac-5").hide();
            $('.c-bl:eq(5)').hide();
        }

    });
 
    
    
    
    $("#sanviti_menu_solicitacao").click(function(){
        $('.b-tg').hide();
        if($('.c-bl:eq(6) > div > div').html() == "Solicitação"){
            $("button[aria-controls='c-ac-6']").show();  
            $("#c-ac-6").show();  
            $('.c-bl:eq(6)').show();
            $("#s-all-bn").hide();
            $("#s-sv-bn").hide();
            

        }else{
            $("button[aria-controls='c-ac-6']").hide();
            $("#c-ac-6").hide();
            $('.c-bl:eq(6)').hide();
        }

    });
 
    
    
    
    $("#sanviti_menu_solicitacao").click(function(){
        $('.b-tg').hide();
        if($('.c-bl:eq(7) > div > div').html() == "Solicitação"){
            $("button[aria-controls='c-ac-7']").show();  
            $("#c-ac-7").show();  
            $('.c-bl:eq(7)').show();
            $("#s-all-bn").hide();
            $("#s-sv-bn").hide();
            

        }else{
            $("button[aria-controls='c-ac-7']").hide();
            $("#c-ac-7").hide();
            $('.c-bl:eq(7)').hide();
        }

    });
 
    
    
    
    $("#sanviti_menu_solicitacao").click(function(){
        $('.b-tg').hide();
        if($('.c-bl:eq(8) > div > div').html() == "Solicitação"){
            $("button[aria-controls='c-ac-8']").show();  
            $("#c-ac-8").show();  
            $('.c-bl:eq(8)').show();
            $("#s-all-bn").hide();
            $("#s-sv-bn").hide();
            

        }else{
            $("button[aria-controls='c-ac-8']").hide();
            $("#c-ac-8").hide();
            $('.c-bl:eq(8)').hide();
        }

    });
 
    
    
    
    $("#sanviti_menu_solicitacao").click(function(){
        $('.b-tg').hide();
        if($('.c-bl:eq(9) > div > div').html() == "Solicitação"){
            $("button[aria-controls='c-ac-9']").show();  
            $("#c-ac-9").show();  
            $('.c-bl:eq(9)').show();
            $("#s-all-bn").hide();
            $("#s-sv-bn").hide();
            

        }else{
            $("button[aria-controls='c-ac-9']").hide();
            $("#c-ac-9").hide();
            $('.c-bl:eq(9)').hide();
        }

    });
 
    
    
    
    $("#sanviti_menu_solicitacao").click(function(){
        $('.b-tg').hide();
        if($('.c-bl:eq(10) > div > div').html() == "Solicitação"){
            $("button[aria-controls='c-ac-10']").show();  
            $("#c-ac-10").show();  
            $('.c-bl:eq(10)').show();
            $("#s-all-bn").hide();
            $("#s-sv-bn").hide();
            

        }else{
            $("button[aria-controls='c-ac-10']").hide();
            $("#c-ac-10").hide();
            $('.c-bl:eq(10)').hide();
        }

    });
 
    
    

 
            $("#sanviti_menu_curriculo").click(function(){
                $('.b-tg').hide();
                if($('.c-bl:eq(1) > div > div').html() == "Currículo"){
                    $("button[aria-controls='c-ac-1']").show();  
                    $("#c-ac-1").show();  
                    $('.c-bl:eq(1)').show();  
                    $("#s-all-bn").hide();
                    $("#s-sv-bn").hide();                       
                }else{
                    $("button[aria-controls='c-ac-1']").hide();
                    $("#c-ac-1").hide();
                    $('.c-bl:eq(1)').hide();
                }
            });   
     
            $("#sanviti_menu_curriculo").click(function(){
                $('.b-tg').hide();
                if($('.c-bl:eq(2) > div > div').html() == "Currículo"){
                    $("button[aria-controls='c-ac-2']").show();  
                    $("#c-ac-2").show();  
                    $('.c-bl:eq(2)').show();  
                    $("#s-all-bn").hide();
                    $("#s-sv-bn").hide();                       
                }else{
                    $("button[aria-controls='c-ac-2']").hide();
                    $("#c-ac-2").hide();
                    $('.c-bl:eq(2)').hide();
                }
            });   
     
            $("#sanviti_menu_curriculo").click(function(){
                $('.b-tg').hide();
                if($('.c-bl:eq(3) > div > div').html() == "Currículo"){
                    $("button[aria-controls='c-ac-3']").show();  
                    $("#c-ac-3").show();  
                    $('.c-bl:eq(3)').show();  
                    $("#s-all-bn").hide();
                    $("#s-sv-bn").hide();                       
                }else{
                    $("button[aria-controls='c-ac-3']").hide();
                    $("#c-ac-3").hide();
                    $('.c-bl:eq(3)').hide();
                }
            });   
     
            $("#sanviti_menu_curriculo").click(function(){
                $('.b-tg').hide();
                if($('.c-bl:eq(4) > div > div').html() == "Currículo"){
                    $("button[aria-controls='c-ac-4']").show();  
                    $("#c-ac-4").show();  
                    $('.c-bl:eq(4)').show();  
                    $("#s-all-bn").hide();
                    $("#s-sv-bn").hide();                       
                }else{
                    $("button[aria-controls='c-ac-4']").hide();
                    $("#c-ac-4").hide();
                    $('.c-bl:eq(4)').hide();
                }
            });   
     
            $("#sanviti_menu_curriculo").click(function(){
                $('.b-tg').hide();
                if($('.c-bl:eq(5) > div > div').html() == "Currículo"){
                    $("button[aria-controls='c-ac-5']").show();  
                    $("#c-ac-5").show();  
                    $('.c-bl:eq(5)').show();  
                    $("#s-all-bn").hide();
                    $("#s-sv-bn").hide();                       
                }else{
                    $("button[aria-controls='c-ac-5']").hide();
                    $("#c-ac-5").hide();
                    $('.c-bl:eq(5)').hide();
                }
            });   
     
            $("#sanviti_menu_curriculo").click(function(){
                $('.b-tg').hide();
                if($('.c-bl:eq(6) > div > div').html() == "Currículo"){
                    $("button[aria-controls='c-ac-6']").show();  
                    $("#c-ac-6").show();  
                    $('.c-bl:eq(6)').show();  
                    $("#s-all-bn").hide();
                    $("#s-sv-bn").hide();                       
                }else{
                    $("button[aria-controls='c-ac-6']").hide();
                    $("#c-ac-6").hide();
                    $('.c-bl:eq(6)').hide();
                }
            });   
     
            $("#sanviti_menu_curriculo").click(function(){
                $('.b-tg').hide();
                if($('.c-bl:eq(7) > div > div').html() == "Currículo"){
                    $("button[aria-controls='c-ac-7']").show();  
                    $("#c-ac-7").show();  
                    $('.c-bl:eq(7)').show();  
                    $("#s-all-bn").hide();
                    $("#s-sv-bn").hide();                       
                }else{
                    $("button[aria-controls='c-ac-7']").hide();
                    $("#c-ac-7").hide();
                    $('.c-bl:eq(7)').hide();
                }
            });   
     
            $("#sanviti_menu_curriculo").click(function(){
                $('.b-tg').hide();
                if($('.c-bl:eq(8) > div > div').html() == "Currículo"){
                    $("button[aria-controls='c-ac-8']").show();  
                    $("#c-ac-8").show();  
                    $('.c-bl:eq(8)').show();  
                    $("#s-all-bn").hide();
                    $("#s-sv-bn").hide();                       
                }else{
                    $("button[aria-controls='c-ac-8']").hide();
                    $("#c-ac-8").hide();
                    $('.c-bl:eq(8)').hide();
                }
            });   
     
            $("#sanviti_menu_curriculo").click(function(){
                $('.b-tg').hide();
                if($('.c-bl:eq(9) > div > div').html() == "Currículo"){
                    $("button[aria-controls='c-ac-9']").show();  
                    $("#c-ac-9").show();  
                    $('.c-bl:eq(9)').show();  
                    $("#s-all-bn").hide();
                    $("#s-sv-bn").hide();                       
                }else{
                    $("button[aria-controls='c-ac-9']").hide();
                    $("#c-ac-9").hide();
                    $('.c-bl:eq(9)').hide();
                }
            });   
     
            $("#sanviti_menu_curriculo").click(function(){
                $('.b-tg').hide();
                if($('.c-bl:eq(10) > div > div').html() == "Currículo"){
                    $("button[aria-controls='c-ac-10']").show();  
                    $("#c-ac-10").show();  
                    $('.c-bl:eq(10)').show();  
                    $("#s-all-bn").hide();
                    $("#s-sv-bn").hide();                       
                }else{
                    $("button[aria-controls='c-ac-10']").hide();
                    $("#c-ac-10").hide();
                    $('.c-bl:eq(10)').hide();
                }
            });   
    


$('.b-tg').hide();

$("#s-sv-bn").click(function(){
    hide_widget_inicial();
});
$("#s-all-bn").click(function(){
    hide_widget_inicial();
});
function hide_widget_inicial(){
    $("#cm").hide();
}

$("#c-txt").css("font-size", "14px" );
$("#c-ttl").css("font-size", "20px" );

$("#s-inr").css("color", "#475f7b" );

$("#cm").css("font-family", "Arial" );
$("#s-cnt").css("font-family", "Arial" );

$("#s-all-bn").css("background-color", "#ec101f" );
$("#s-all-bn").css("color", "#ffffff" );

$("#s-sv-bn").css("background-color", "#e5ebef" );
$("#s-sv-bn").css("color", "#253b48" );

$("#cm").css("border-radius", "10px" );
$("#s-inr").css("border-radius", "10px" );



$("#enviar_solicitacao").css("color", "#ffffff" );
$("#enviar_solicitacao").css("background-color", "#ec101f" );
$("#enviar_solicitacao").css("border-radius", "25px" );


$("#enviar_curriculo").css("color", "#ffffff" );
$("#enviar_curriculo").css("background-color", "#ec101f" );
$("#enviar_curriculo").css("border-radius", "25px" );




$("#cm").css("background-color", "#ffffff" );

$("#c-s-bn").css("background-color", "#e5ebef" );
$("#c-s-bn").css("color", "#253b48" );
$("#c-s-bn").css("border-radius", "25px" );

$("#s-sv-bn").css("border-radius", "25px" );
$("#s-all-bn").css("border-radius", "25px" );



$("#c-p-bn").css("color", "#ffffff" );
$("#c-p-bn").css("background-color", "#ec101f" );
$("#c-p-bn").css("border-radius", "25px" );

$("#c-ttl").css("color", "#475f7b"  );

$("#c-txt").css("color", "#475f7b"  );

{/* <button  style="font-size: 12px;border-color: black; border-radius: 25px;position:fixed;position:fixed;width:200px;height:30px;bottom:40px;left:40px;" aria-label="View cookie settings" data-cc="c-settings"><img src="https://lgpdcontrol.com.br/cookie/olhos.png" width="19" height="19"> Opções de privacidade</button> */}

$("#s-bns").css("height","6.9375em");

$("#s-bns").append("<div style='position: absolute;bottom: 0;left: 0;right: 0;padding: 1em 2.5em;border-top: 1px solid #f1f3f5;border-color: var(--cc-section-border);height: 2.9375em;'><span style='position: absolute;top: 10px;left:550px;font-size:13px '>Powered by  <a style='vertical-align:middle;' href='https://lgpdcontrol.com.br/lp' target='_blank'><img src='https://lgpdcontrol.com.br/icon/LGPDcontrol.png' style='width:40%' ></a></span></div>");

$("#c-bns").append("<div style='position: relative;margin-top:15px;left:180px;font-size:13px'>Powered by  <a style='vertical-align:middle;' href='https://lgpdcontrol.com.br/lp' target='_blank'><img src='https://lgpdcontrol.com.br/icon/LGPDcontrol.png' style='width:24%'></a></div>");


class FormMask {
    constructor(element, mask, replacementChar, charsToIgnore) {    
        this.input = element
        this.mask = mask
        this.char = replacementChar
        this.specialChars = charsToIgnore
        this.input.value = this.mask
        this.applyListeners()
    }

    applyListeners() {
        if(this.input.value == this.mask) this.input.value = ""

        this.input.addEventListener("focus", () => this.moveCursorToStart()) //empty case, add mask and go to the beginning
        this.input.addEventListener("click", () => this.moveCursorToStart())

        this.input.addEventListener("blur", e => {

        

            const inputChars = this.input.value.split("")
            const ignore = inputChars.indexOf(this.char) < 0

            const className = ignore ? "valid" : "invalid"

            this.cleanAndSetClasses(this.input, [className])

            if(this.input.value == this.mask) this.input.value = ""

        })

        this.input.addEventListener("keydown", e => {

            if(e.key == "Backspace" || e.key == "Delete") {
                
                this.deleteValue( this.input.value.split("") )
                e.preventDefault()

            }

        })

        this.input.addEventListener("keypress", e => {

            e.preventDefault()

            const numberKey = (!isNaN(e.key) && e.key != " ") //(" " == 0) to javascript

            if(!numberKey) return

            const inputChars = this.input.value.split("")

            this.maskPattern(inputChars, e)

        })

        this.input.addEventListener("paste", e => {
            const data = e.clipboardData.getData("text")
            this.onPasteData(data)
            e.preventDefault()

        })

    }

    moveCursorToStart() {
        this.cleanAndSetClasses(this.input, [])
        if(this.input.value == "" || this.input.value == this.mask) {
            const inputChars = this.input.value.split("")
            const indexToStart = inputChars.indexOf(this.char)
            this.input.value = this.mask
            this.input.setSelectionRange(indexToStart, indexToStart) //cursor position
        }

    }

    cleanAndSetClasses(element, classes) {

        element.classList.remove("valid", "invalid")
        classes.forEach(className => element.classList.add(className))

    }

    maskPattern(inputChars, event) {

        let cursor = this.input.selectionStart
        
        for(let i=cursor; i<inputChars.length; i++) { //grant to skip all special chars on insert

            let ignore = this.specialChars.indexOf(inputChars[i]) >= 0 //if special char, ignore (increment cursor)

            if(!ignore) break
            
            cursor++ //jump to next char != ignored

        }
        
        inputChars.splice(cursor, 1, event.key)
        
        this.insertValue(inputChars.join(""), cursor+1)

    }

    insertValue(result, cursor) {

        if(result.length != this.mask.length) return

        this.input.value = result

        if(cursor >= 0) this.input.setSelectionRange(cursor, cursor)

    }

    deleteValue(inputChars) {

        const withoutSelectionRange = this.checkSelectionRange(inputChars)

        if(!withoutSelectionRange) return

        let cursor = this.input.selectionStart

        for(let i=0; i<inputChars.length; i++) { //skip special chars on delete

            let ignore = this.specialChars.indexOf(inputChars[cursor-1]) >= 0

            if(!ignore) break
            
            cursor -= 1

        }

        inputChars.splice(cursor-1, 1, this.char)

        this.insertValue(inputChars.join(""), cursor-1)

    }

    checkSelectionRange(inputChars) {

        if(this.input.selectionStart == this.input.selectionEnd) return true

        let start = this.input.selectionStart
        let end = this.input.selectionEnd

        for(let i=start; i<end; i++) {

            let nonSpecialChar = this.specialChars.indexOf(inputChars[i]) < 0
            
            if(nonSpecialChar) inputChars.splice(i, 1, this.char)

        }

        this.insertValue(inputChars.join(""), start)

        return false

    }

    onPasteData(data) {
        
        const maskChars = this.mask.split("")
        const dataChars = data.split("")

        const onlyNumbers = dataChars.filter( value => !isNaN(value) && value != " " )
        const maskWithoutSpecialChars = maskChars.filter( value => value == this.char )

        const numberOfChars = maskWithoutSpecialChars.length

        for(let i=0; i<numberOfChars; i++) {

            let positionChar = maskChars.indexOf(this.char)
            let number = onlyNumbers[i] || this.char

            maskChars.splice(positionChar, 1, number)
        }

        this.input.value = ""

        this.insertValue(maskChars.join(""), maskChars.indexOf(this.char))

    }

    }
new FormMask(document.querySelector("#cpf_sanviti"), "___.___.___-__", "_", [".", "-"]);

new FormMask(document.querySelector("#cpf_curriculo_sanviti"), "___.___.___-__", "_", [".", "-"]);


new FormMask(document.querySelector("#telefone_sanviti"), "(  )         ", " ", ["(",")",".", "-"]);

new FormMask(document.querySelector("#telefone_curriculo_sanviti"), "(  )         ", " ", ["(",")",".", "-"]);






setTimeout(function(){
    
    $("#enviar_solicitacao").click(function(){
    
        if($("#lgpd_sanviti:checked").val() === "1"){  
            $("#msg_aceite_sanviti").html("");
         }else{ 
            $("#msg_aceite_sanviti").html("<p style='color:red'><b>Atenção,</b> o não aceite dos termos descritos nesse formulário, impossibilita o tratamento de dados pessoais e demais processos relacionados. Os dados informados não poderão ser enviados!</p>"); 
         }
        });

        $("#lgpd_sanviti").click(function(){
            if($("#lgpd_sanviti:checked").val() === "1"){  
                $("#msg_aceite_sanviti").html("");
             }else{ 
                $("#msg_aceite_sanviti").html("<p style='color:red'><b>Atenção,</b> o não aceite dos termos descritos nesse formulário, impossibilita o tratamento de dados pessoais e demais processos relacionados. Os dados informados não poderão ser enviados!</p>"); 
             }
        });

        $("#enviar_curriculo").click(function(){
            if($("#lgpd_curriculo_sanviti:checked").val() === "1"){  
                $("#msg_aceite_curriculo_sanviti").html("");
            }else{ 
                $("#msg_aceite_curriculo_sanviti").html("<p style='color:red'><b>Atenção,</b> o não aceite dos termos descritos nesse formulário, impossibilita o tratamento de dados pessoais e demais processos relacionados. Os dados informados não poderão ser enviados!</p>"); 
            }
        });

        $("#lgpd_curriculo_sanviti").click(function(){
            if($("#lgpd_curriculo_sanviti:checked").val() === "1"){  
                $("#msg_aceite_curriculo_sanviti").html("");
             }else{ 
                $("#msg_aceite_curriculo_sanviti").html("<p style='color:red'><b>Atenção,</b> o não aceite dos termos descritos nesse formulário, impossibilita o tratamento de dados pessoais e demais processos relacionados. Os dados informados não poderão ser enviados!</p>"); 
             }
        });

    var tag_sanviti = $("#tags_sanviti").val();
    tag_sanviti = tag_sanviti.split(',');
    for(var i = 0; i < tag_sanviti.length; i++){       
        $("input[value="+tag_sanviti[i]+"]").prop("checked",true);     
        var cookies = document.cookie.split("; ");
        for (var c = 0; c < cookies.length; c++) {
            var d = window.location.hostname.split(".");
            while (d.length > 0) {
          
                if(encodeURIComponent(cookies[c].split(";")[0].split("=")[0]) == tag_sanviti[i]){                      
                    var cookieBase =  '=; expires=Thu, 01-Jan-1970 00:00:01 GMT; domain=' + d.join('.') + ' ;path=';                 
                }else if(encodeURIComponent(cookies[c].split(";")[0].split("=")[0]) == "cc_cookie" ){
                    var cookieBase =  '=; expires=Thu, 01-Jan-1970 00:00:01 GMT; domain=' + d.join('.') + ' ;path=';  
                }else{           
                    var cookieBase = encodeURIComponent(cookies[c].split(";")[0].split("=")[0]) + '=; expires=Thu, 01-Jan-1970 00:00:01 GMT; domain=' + d.join('.') + ' ;path=';
                }
            // var cookieBase = encodeURIComponent(cookies[c].split(";")[0].split("=")[0]) + '=; expires=Thu, 01-Jan-1970 00:00:01 GMT; domain=' + d.join('.') + ' ;path=';
                var p = location.pathname.split('/');
                document.cookie = cookieBase + '/';
                while (p.length > 0) {
                    document.cookie =  cookieBase + p.join('/');
                    p.pop();
                };
                d.shift();
            }
        }     
    }
}, 500);


    $("input[value=]").click(function(){
        if($("input[value=]").is(":checked") != ""){    
            $(".").prop("checked",true);
        }else{
            $(".").prop("checked",false);
        }
    });
    
    $(".").click(function(){
        if($(".").is(":checked") != ""){    
            $("input[value=]").prop("checked",true);
        }else{
            $("input[value=]").prop("checked",false);
        }
    });

