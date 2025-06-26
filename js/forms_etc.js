$(document).ready(function () {
    /* BOTAO TOPO */
    var tempo = 1000;
    var offset = 200;
    $('body').append('<a href="#" class="ao-topo"></a>');
    $(window).scroll(function(){
        if( $(this).scrollTop() > offset ){
            $('.ao-topo').fadeIn(tempo);
        } else {
            $('.ao-topo').fadeOut(tempo);
        }
    });
    $('.ao-topo').click(function(event){
        event.preventDefault();
        $('html, body').animate({scrollTop: 0}, tempo);
        return false;
    });
    /* FIM BOTAO TOPO */
    /* MENU FIXO */
    $(window).scroll(function(){
        if( $(this).scrollTop() > 100 ){
            $('#topo-container').addClass('fixo');
        } else {
            $('#topo-container').removeClass('fixo');
        }
    });
    /* FIM MENU FIXO */

    /*MÁSCARAS*/
    $(".data").mask("99/99/9999");
    $(".hora").mask("99:99");
    $(".fone").mask("(99)9999-9999?9");
    $(".uf").mask("aa");
    $(".cep").mask("99999-999");
    $(".placa").mask("aaa-9999");
    $(".cpf").mask("999.999.999-99");
    $(".cnpj").mask("99.999.999/9999-99");
    /*FIM MÁSCARAS*/

    $("#envia_busca").click(function (event) {
        event.preventDefault();
        $("#busca_sinistro").submit();
    });
    
    $("#busca_sinistro").validar({
        "after": function () {
            $("#envies p").html("Buscando");
            $("#envies").show('slow');
            $.post(URLBASE + 'areacliente/buscar', this.serialize(), function (data) {
                if (data.ok == true) {
                    $("#envies").hide("slow");
                    abreSinistroCliente(data.id);
                } else if (data.ok == 'cpfcnpj') {
                    $("#envies p").html("CPF/CNPJ Não encontrado");
                    setTimeout(function () {
                        $("#envies").hide("slow");
                    }, 4000);
                } else {
                    $("#envies p").html("Nenhum registro encontrado");
                    setTimeout(function () {
                        $("#envies").hide("slow");
                    }, 4000);
                }
                //ESCONDE DEPOIS DE 3 SEGUNDOS
            }, 'json');
            return false;
        },
        "marcar": false
    });

    /*PÁGINA CONTATO*/
    $("#fale").click(function (event) {
        event.preventDefault();
        $("#form_contato").submit();
    });
    
    $("#form_contato").validar({
        "after": function () {
            $("#envies").show('slow');
            $.post(URLBASE + 'contato/enviar', this.serialize(), function (data) {
                if (data.ok) {
                    $("#envies p").html("Contato enviado com sucesso");
                    document.form_contato.reset();
                } else {
                    $("#envies p").html("Não foi possível enviar o contato!!");
                }

                //ESCONDE DEPOIS DE 3 SEGUNDOS
                setTimeout(function () {
                    $("#envies p").html("Enviando");
                    $("#envies").hide("slow");
                }, 3000);
            }, 'json');
            return false;
        },
        "marcar": false
    });

    $("#envia_sinistro").click(function (event) {
        event.preventDefault();
        $("#busca_franqueado").submit();
    });
    
    $("#busca_franqueado").validar({
        "after": function () {
            $("#envies").show('slow');
            $.post(URLBASE + 'contato/enviar', this.serialize(), function (data) {
                if (data.ok) {
                    $("#envies p").html("Contato enviado com sucesso");
                    document.form_contato.reset();
                } else {
                    $("#envies p").html("Não foi possível enviar o contato!!");
                }

                //ESCONDE DEPOIS DE 3 SEGUNDOS
                setTimeout(function () {
                    $("#envies p").html("Enviando");
                    $("#envies").hide("slow");
                }, 3000);
            }, 'json');
            return false;
        },
        "marcar": false
    });

    $("#form_comentario").validar({    
        "after": function() {
            var formData = new FormData(this[0]);
            $("#envies").show('slow');
             $.ajax({
                type: 'POST',
                dataType:"JSON",
                enctype: 'multipart/form-data',
                url: URLBASE + 'areafranqueado/enviar',
                data: formData,
                processData: false,
                contentType: false,
                success: function(data) {
                    if (data.ok) {
                        $("#envies").hide();
                        swal('Pronto', 'Comentário enviado com sucesso', 'success');
                        document.form_comentario.reset();
                    } else {
                        $("#envies").hide();
                        swal('Ops', 'Não foi possível enviar o comentário', 'error');
                    }
                },
                error: function(data) {
                    console.log(data);
                }
            });
            return false;
        },"marcar": false
    });
    
    $("#form_vidro").validar({
        "after": function () {
            $("#envies").show('slow');
            $.post(URLBASE + 'areafranqueado/enviarvidro', this.serialize(), function (data) {
                if (data.ok) {
                    $("#envies").hide();
                    swal('Pronto', 'Comentário enviado com sucesso', 'success');
                    document.form_vidro.reset();
                } else {
                    $("#envies").hide();
                    swal('Ops', 'Não foi possível enviar o comentário', 'error');
                }
            }, 'json');
            return false;
        },
        "marcar": false
    });
    /*FIM PÁGINA CONTATO*/

    $("#form-sinistro-residencial").validar({
        "after": function () {
            $("#envies").show('slow');
        },
        "marcar": false
    });

    $("#form_sinistro_automovel").validar({
        "after": function () {
            $("#envies").show('slow');
        },
        "marcar": false
    });

    /*PÁGINA PRODUTO*/
    $("#faleC").click(function (event) {
        event.preventDefault();
        $("#form_cotacao").submit();
    });

    $("#form_cotacao").validar({
        "after": function () {
            $("#envies").show('slow');
            $.post(URLBASE + 'produtos/enviar', this.serialize(), function (data) {
                if (data.ok) {
                    $("#envies p").html("Cotação enviada com sucesso");
                    document.form_cotacao.reset();
                } else {
                    $("#envies p").html("Não foi possível enviar a cotação!!");
                }

                //ESCONDE DEPOIS DE 3 SEGUNDOS
                setTimeout(function () {
                    $("#envies p").html("Enviando");
                    $("#envies").hide("slow");
                }, 3000);
            }, 'json');
            return false;
        },
        "marcar": false
    });
    /*FIM PÁGINA PRODUTO*/

    $("#form_franqueado").validar({
        "after": function () {
            $("#envies").show('slow');
            $.post(URLBASE + 'sejafranqueado/enviar', this.serialize(), function (data) {
                if (data.ok) {
                    $("#envies p").html("Mensagem enviada com sucesso.<br> Em breve entraremos em contato");
                    document.form_franqueado.reset();
                } else {
                    $("#envies p").html("Não foi possível enviar a mensagem!!");
                }

                //ESCONDE DEPOIS DE 3 SEGUNDOS
                setTimeout(function () {
                    $("#envies").hide("slow");
                }, 5000);
            }, 'json');
            return false;
        },
        "marcar": false
    });
    

    $("#login_franqueado").validar({
        "after": function() {
            $.post(URLBASE + 'areafranqueado/login', this.serialize(), function(data) {
                if (data.ok) {
                    location.href=URLBASE+'areafranqueado';                
                } else {
                    swal('Ops', 'Email ou senha incorretos', 'error');
                    document.login_franqueado.reset();
                }
            }, 'json');
            return false;
        },
        "marcar": false
    });

    /*TRABALHE CONOSCO*/
    $("#faleT").click(function (event) {
        event.preventDefault();
        $("#form_trabalhe").submit();
    });

    $("#form_trabalhe").validar({
        "after": function () {
            $("#envies").show('slow');
        },
        "marcar": false
    });
    /*FIM TRABALHE CONOSCO*/

    /*HOME*/
    $("#form_novidades").validar({
        "after": function () {
            $.post(URLBASE + 'ajax/news', this.serialize(), function (data) {
                if (data.ok) {
                    alert("Cadastro efetuado com sucesso!");
                    document.form_novidades.reset();
                } else {
                    alert("E-mail já cadastrado!");
                }
            }, 'json');
            return false;
        },
        "marcar": false
    });
    $('#banner').bxSlider({
        controls: false,
        speed: 2500,
        auto: true,
        pause: 6000
        //infiniteLoop: false
    });   

    $('#gira-seguradoras').bxSlider({
        // controls: true,
        // speed: 2500,
        // auto: false,
        // minSlides: 10,
        // maxSlides: 50,
        // slideWidth: 130,
        // infiniteLoop: true,
        // pager: false,
        // slideMargin: 100,
        // pause: 10000
        // mode: 'horizontal', //mode: 'fade',  

        shrinkItems: true,
        minSlides: 1,
        maxSlides: calcularNumeroDeSlidesPorPagina(),
        slideMargin: 100,
        slideWidth: 130,
        touchEnabled: false,
        auto : true,
        controls: false,
        pager: false,
        easing: 'linear' ,
        moveSlides: 1,
        speed: 2500,
        pause: 0,
        infiniteLoop: true

    });
    /*FIM HOME*/

    /*CONTATO*/
    var menu = $('.tipo-contato li a');
    $(menu).click(function (event) {
        event.preventDefault();
        var formulario = $(this).attr('href')
        if ($(this).hasClass('active')) {
        } else {
            $(this).parent().siblings().find('a').removeClass('active')
            $(this).addClass('active')
            $(formulario).fadeIn().siblings().hide();
        }
    });
    $('.tipo-contato li:first-child a').click();
    $('#anexar').change(function () {
        var str = $(this).val().split('\\').pop();
        $(this).next().text(str);
    });
    /*FIM CONTATO*/

    /*UNIDADES*/
    $('.unidades ul li:first-child').click();
    /*FIM UNIDADES*/
});

/*UNIDADES*/
//cada click gera o mapa
var cidade = $('.unidades ul li');

$(cidade).click(function () {
    if ($(this).hasClass('active')) {

    } else {
        $(this).addClass('active');
        $(this).siblings().removeClass('active');
    }
    var altura = $('.unidades').height();
    $('#mapa').css('height', altura - 5)

    var mapStyle = [{"featureType": "administrative", "elementType": "labels.text.fill", "stylers": [{"color": "#444444"}]}, {"featureType": "landscape", "elementType": "all", "stylers": [{"color": "#f2f2f2"}]}, {"featureType": "landscape.man_made", "elementType": "geometry.fill", "stylers": [{"hue": "#0200ff"}, {"saturation": "17"}, {"invert_lightness": true}, {"visibility": "simplified"}]}, {"featureType": "landscape.man_made", "elementType": "labels.text.fill", "stylers": [{"visibility": "on"}, {"saturation": "-83"}, {"lightness": "-100"}]}, {"featureType": "poi", "elementType": "all", "stylers": [{"visibility": "off"}]}, {"featureType": "road", "elementType": "all", "stylers": [{"saturation": -100}, {"lightness": 45}]}, {"featureType": "road.highway", "elementType": "all", "stylers": [{"visibility": "simplified"}]}, {"featureType": "road.arterial", "elementType": "labels.icon", "stylers": [{"visibility": "off"}]}, {"featureType": "transit", "elementType": "all", "stylers": [{"visibility": "off"}]}, {"featureType": "water", "elementType": "all", "stylers": [{"color": "#f9fcfd"}, {"visibility": "on"}]}]
    //pega a cordenada q passei no <li>
    var cordenada = $(this).attr('data-cordenada')

    var coord = cordenada.split(",");

    var myCenter = new google.maps.LatLng(parseFloat(coord[0]), parseFloat(coord[1]));
    console.log(myCenter)
    var marker;

    var mapProp = {
        center: myCenter,
        zoom: 15,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: mapStyle
    };

    var map = new google.maps.Map(document.getElementById("mapa"), mapProp);

    var marker = new google.maps.Marker({
        position: myCenter,
        animation: google.maps.Animation.BOUNCE,
        icon: 'images/pin.png'
    });



    marker.setMap(map);
});
/*FIM UNIDADES*/

//VERIFICA O 9 DIGITO DO TELEFONE
function verificaTelefone(puti) {
    valor = $(puti).val();
    valor = valor.replace('_', '');
    //console.log(valor);
    if (valor.length > 13) {
        //console.log(14);
        $(puti).mask('(99)99999-9999');
    } else {
        //console.log(13);
        $(puti).mask('(99)9999-9999?9');
    }
}

function number_format(number, decimals, dec_point, thousands_sep) {
    // http://kevin.vanzonneveld.net
    // +   original by: Jonas Raoni Soares Silva (http://www.jsfromhell.com)
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +     bugfix by: Michael White (http://getsprink.com)
    // +     bugfix by: Benjamin Lupton
    // +     bugfix by: Allan Jensen (http://www.winternet.no)
    // +    revised by: Jonas Raoni Soares Silva (http://www.jsfromhell.com)
    // +     bugfix by: Howard Yeend
    // +    revised by: Luke Smith (http://lucassmith.name)
    // +     bugfix by: Diogo Resende
    // *     example 1: number_format(1234.56);
    // *     returns 1: '1,235'
    // *     example 2: number_format(1234.56, 2, ',', ' ');
    // *     returns 2: '1 234,56'
    // *     example 3: number_format(1234.5678, 2, '.', '');
    // *     returns 3: '1234.57'
    // *     example 4: number_format(67, 2, ',', '.');
    // *     returns 4: '67,00'

    var n = number, prec = decimals, dec = dec_point, sep = thousands_sep;
    n = !isFinite(+n) ? 0 : +n;
    prec = !isFinite(+prec) ? 0 : Math.abs(prec);
    sep = sep == undefined ? ',' : sep;

    var s = n.toFixed(prec),
            abs = Math.abs(n).toFixed(prec),
            _, i;

    if (abs > 1000) {
        _ = abs.split(/\D/);
        i = _[0].length % 3 || 3;

        _[0] = s.slice(0, i + (n < 0)) +
                _[0].slice(i).replace(/(\d{3})/g, sep + '$1');

        s = _.join(dec || '.');
    } else {
        s = abs.replace('.', dec_point);
    }

    return s;
}

function calcularNumeroDeSlidesPorPagina() {
    var quantidadeSlides = 0;
    var slidesPorPagina = 10;
    $("#gira-seguradoras li").each(function(){
        quantidadeSlides++;
    });
    console.log("Quantidade de Slides: " + quantidadeSlides);
    if(quantidadeSlides > 20) {
        var continuar = true;
        var divisor = 2;
        while(continuar) {
            var resto = quantidadeSlides % divisor;
            if(resto == 0) {
                if(Math.floor(quantidadeSlides / divisor) <= 10) {
                    continuar = false;
                } else { 
                    if (divisor < 6) {
                        divisor++;
                    } else {
                        continuar = false;
                    }
                }
            } else {
                if (divisor < 5) {
                    divisor++;
                } else {
                    continuar = false;
                }
            }
        }
        slidesPorPagina = Math.floor(quantidadeSlides / divisor);
        console.log("Slides por página: " + slidesPorPagina);
    }
    return slidesPorPagina;
}