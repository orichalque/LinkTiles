/**
 * Application angular JS permettant de récuperer les resultats présent en base
 * Utilisée sur la page index.html
 * La recuperation des données s'effectue par appels REST sur l'application SLD360
 */
(function () {
    /**
     * Dependances
     * $scope: Acces aux variables JS depuis le HTML
     * $http: Gestion des appels REST
     * ng-fusioncharts: Permet de creer les graphiques
     */
    var app = angular.module("resultatsdomainesApp", ["ng-fusioncharts", "ngAnimate", 'ui.bootstrap']);
    app.controller("ResultatsDomainesCtrl", ['$scope', '$rootScope', '$http', '$filter', '$q', function ($scope, $rootScope, $http, $filter, $q) {



        sendHttpRequest = function(uri, parameters, pMethod) {
            var defer = $q.defer();
            $http({
                method: pMethod,
                url:  uri,
                data: parameters
            },{},'GET').then(function successCallback(response) {
                defer.resolve(response.data);
            }, function errorCallback(response) {
            });
            return defer.promise;
        };

        /**
         * Page résumé resultat robot recipe
         * ==============================================================
         */

        /**
         * données pour le donut chart sur la proportion des campagne
         * @type {Array}
         */
        $scope.dataPie=[];

        /**
         * recupération de la version au niveau de l'url
         */

        $scope.urlParam = function (name) {
            //analyse de l'url avec expresion regulière
            var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
            if (results == null) {
                return null;
            }
            else {
                return results[1] || 0;
            }
        };

        sendHttpRequest('/RecipeSLD/rest/groupes',{},'GET').then(function (data) {
            $scope.groupes = data;
        });

        /**
         * Version consultée
         */
        $scope.version = $scope.urlParam('version');

        if ($scope.version == null) {
            $scope.version = '16SI2'
        }
        $rootScope.version = $scope.version;

        /**
         * Liste de Dernier résultat de chaque campagne de la version courante
         * @type Array of Json de resultats campagne
         */
        $scope.listOfLastResCampagnes = [{nom_campagne: "LOADING..."}];
        /** pour remplir le dropdown campagne
         * et recapitulatif campagne (bar progression et nb tests)
         */
        getLastResultatsCampagnes = function () {
            sendHttpRequest('/RecipeSLD/rest/resultatscampagnes/version_SI/' + $scope.version + "/last",{},'GET').then(function (data) {
                $scope.TOTtests = 0;
                $scope.TOTkof=0;
                $scope.TOTkot=0;
                $scope.listOfLastResCampagnes = data;
                var temps_tot = new Date(0, 0, 0, 0, 0, 0, 0);
                // Calcul des données agrégées toutes campagnes confondues
                for(i in data){
                    var camptmp= data[i];
                    var times = camptmp.temps_exec.split(":");
                    temps_tot.setHours(temps_tot.getHours() + parseInt(times[0]));
                    temps_tot.setMinutes(temps_tot.getMinutes() + parseInt(times[1]));
                    temps_tot.setSeconds(temps_tot.getSeconds() + parseInt(times[2]));

                    $scope.TOTtests += camptmp.nb_test;
                    $scope.TOTkof+=camptmp.erreurs_fonc;
                    $scope.TOTkot+=camptmp.erreurs_tech;
                }
                $scope.TOTtps = temps_tot;
                $scope.TOTok=$scope.TOTtests-$scope.TOTkof- $scope.TOTkot;
                $scope.PerCentok= $scope.TOTok/$scope.TOTtests *100;
                $scope.PerCentkof=$scope.TOTkof/$scope.TOTtests *100;
                $scope.PerCentkot=$scope.TOTkot/$scope.TOTtests *100;

                /**
                 * Liste des derniers resultats de domaines de la version courante
                 * @type Array of Json de resultatDomaine
                 */
                $scope.listOfLastResCampagnes_domaines = [];
                getLastResultatsDomainesByCamp(0);
                /**
                 * Liste des derniers resultats de groupe de la version courante
                 * @type Array of Json de resultatGroupe
                 */
                $scope.listOfLastResCampagnes_groupes = [];
                getLastResultatsGroupeByCamp(0);
                getResultatsCampagnes();

            });
        };

        getLastResultatsCampagnes();

        /**
         * Pour dérouler le dropdown campagne
         * par défaut non déroulée
         */
        $scope.detailOn = false;
        document.getElementById("caret-bar").className = "caret caret-unreversed";

        /**
         * changement du booleen décidant de l'affichage des détails des campagnes
         * + animation du caret
         */
        $scope.detail = function () {
            $scope.detailOn = !$scope.detailOn;
            if ($scope.detailOn == true) {
                document.getElementById("caret-bar").className = "caret";
            } else {
                document.getElementById("caret-bar").className = "caret caret-unreversed";
            }
        };
        /**
         * ==============================================================
         */


        /**
         * Page resultat d'une campagne
         * ==============================================================
         */

        /**
         * Recuperation des dernieres données resultats domaines pour une campagne
         * Appelé pour chaque campagne
         * @param index index de la campagne
         */
        getLastResultatsDomainesByCamp = function (index) {
            var campagne = $scope.listOfLastResCampagnes[index];
            console.log("campagne in listOfLastResCampagnes " + campagne);
            sendHttpRequest('/RecipeSLD/rest/resultatsdomaines/version_SI/' + $scope.version + '/campagne/' + campagne.nom_campagne + '/last',{},'GET').then(function (data) {
                var doms = data;
                for (j in doms) {
                    var dom = doms[j];
                    dom.nom_campagne = campagne.nom_campagne;
                    $scope.listOfLastResCampagnes_domaines.push(dom);
                }
                var prochain_appel = 0;
                for (i in $scope.listOfLastResCampagnes) {
                    if (i > index) {
                        prochain_appel = i;
                        break;
                    }
                }
                if (prochain_appel > 0) {
                    getLastResultatsDomainesByCamp(prochain_appel);
                } else {

                }
            });
        };
        /**
         * Tableau de valeurs hexa pour générer les nuances de grey
         * @type {*[]}
         */
        var tab_hexa=[3,4,5,6,7,8,9,'a','b','c','d','e'];
        /**
         * Recuperation des données de resultats groupe pour une campagne et un date (date de la campagne)
         * (+ créations des données pour le graphique de proportion par campagne)
         * @param index indice de la campagne
         */
        getLastResultatsGroupeByCamp = function (index) {
            var campagne = $scope.listOfLastResCampagnes[index];

            //-------Creation des données pour le pie charts sur le nb de tests-----------------
            /**
             * Gris en hexa = #AAA avec A nombre hexa entre 00 et ff
             * @type {string}
             */
            var couleur = ""+tab_hexa[Math.floor(Math.random()*12)] + tab_hexa[Math.floor(Math.random()*12)];
            couleur = "#"+couleur+couleur+couleur;
            var donnee = {value: campagne.nb_test, label: "tests "+campagne.nom_campagne, color: couleur};
            $scope.dataPie.push(donnee);
            //------------------------------------------------------------------------------------------------
            sendHttpRequest('/RecipeSLD/rest/resultatsgroupes/nom_campagne/' + campagne.nom_campagne + '/date_exec/' + campagne.date_exec + '/version_SI/' + $scope.version,{},'GET').then(function (data) {
                var groupes = data;
                for (j in groupes) {
                    var groupe = groupes[j];
                    groupe.nom_campagne = campagne.nom_campagne;
                    groupe.nom_groupe = getNomGroupe(groupe.id_groupe);
                    groupe.nom_domaine = getDomGroupe(groupe.id_groupe);
                    $scope.listOfLastResCampagnes_groupes.push(groupe);
                }
                //probleme si on fait directement les appels rest dans la boucle for, il faut attendre que le précédent ai terminé
                var prochain_appel = 0;
                for (i in $scope.listOfLastResCampagnes) {
                    if (i > index) {
                        prochain_appel = i;
                        break;
                    }
                }
                if (prochain_appel > 0) {
                    getLastResultatsGroupeByCamp(prochain_appel);
                } else {
                    constructDonutChart();
                }
            });
        };
        /**
         * ==============================================================
         */


        /**
         * Page Historique graphiques
         * ==============================================================
         */

        /**
         * type courant du graphique d'historique des données
         * @type {string}
         */
        $scope.typeGraph = "stackedarea2d";
        /**
         * changement du type de graphique
         */
        $scope.changeTypeGraph = function () {
            if ($scope.typeGraph == "stackedcolumn2d") {
                $scope.typeGraph = "stackedarea2d";
                document.getElementById('button-graph').innerHTML = 'Graphique en bâtons empilés';
            } else {
                $scope.typeGraph = "stackedcolumn2d";
                document.getElementById('button-graph').innerHTML = 'Graphique en aires';
            }
        };

        /**
         * Données pour historique
         * un élément par campagne
         * @type array of datas
         */
        $scope.myDataSource = [];
        /**
         * List des Campagnes et leurs historiques
         * Pas de redondance sur les noms de campagne
         * utile pour construire les donnees de graphiques et le tableau d'historique
         * @type {Array} of JSON de la contenant la liste des dates, la liste des tests Ok, KOF, KOT et le nom de la campagne
         */
        $scope.listOfCampagnes = [];
        /**
         * Liste des noms des campagnes
         * @type {Array} of strings
         */
        $scope.nomDesCamp = [];
        getResultatsCampagnes = function () {
            sendHttpRequest('/RecipeSLD/rest/resultatscampagnes/version_SI/' + $scope.version,{},'GET').then(function (data) {
                $scope.myDataSource = {};
                $scope.resultatscampagnes = data;
                var nb_test = 0;
                var nb_error = 0;
                var nb_fonc = 0;
                var perc_test = 0;
                var perc_error = 0;
                var perc_fonc = 0;

                for (var i = 0; i < $scope.resultatscampagnes.length; i++) {
                    var resultat = $scope.resultatscampagnes[i];
                    var index = $scope.nomDesCamp.indexOf(resultat.nom_campagne);
                    var datas = {};
                    if (index < 0) {
                        datas.datesForGraph = [];
                        datas.testsOKForGraph = [];
                        datas.testsKO_F_ForGraph = [];
                        datas.testsKO_T_ForGraph = [];
                        datas.nom_campagne = resultat.nom_campagne;
                        $scope.listOfCampagnes.push(datas);
                        $scope.nomDesCamp.push(resultat.nom_campagne);
                        index = $scope.nomDesCamp.indexOf(resultat.nom_campagne);
                    }

                    var date = new Date(resultat.date_exec);
                    $scope.listOfCampagnes[index].datesForGraph.push({"label": date.toLocaleDateString(),
                        "tooltext": ""});
                    nb_test = resultat.nb_test;
                    nb_error = resultat.erreurs_tech;
                    nb_fonc = resultat.erreurs_fonc;
                    perc_test = $filter('number')(((nb_test - nb_error - nb_fonc)*100/nb_test),1);
                    perc_error = $filter('number')((nb_fonc*100/nb_test), 1);
                    perc_fonc = $filter('number')((nb_error*100/nb_test),1) ;
                    $scope.listOfCampagnes[index].testsOKForGraph.push({
                        "value": (nb_test - nb_error - nb_fonc),
                        "displayValue": perc_test +"%",
                        "showvalue": "1",
                        "tooltext": date.toLocaleDateString() + "{br}" + "{br}Tests: " + nb_test + "{br}<strong>Reussis: " + (nb_test - nb_error - nb_fonc) + " (" + perc_test + "%)" + "</strong>{br}Erreurs fonc: " + nb_fonc  + " (" + perc_fonc + "%)" + "{br}Erreurs tech: " + nb_error  + " (" + perc_error + "%)"});
                    $scope.listOfCampagnes[index].testsKO_F_ForGraph.push({
                        "value": nb_fonc,
                        //"displayValue": perc_error +"%",
                        "showvalue": "0",
                        "tooltext": date.toLocaleDateString() + "{br}" + "{br}Tests: " + nb_test + "{br}Reussis: " + (nb_test - nb_error - nb_fonc) + " (" + perc_test + "%)" + "{br}<strong>Erreurs fonc: " + nb_fonc + " (" + perc_fonc + "%)" + "</strong>{br}Erreurs tech: " + nb_error + " (" + perc_error + "%)"});
                    $scope.listOfCampagnes[index].testsKO_T_ForGraph.push({
                        "value": nb_error,
                        "showvalue": "0",
                        //"displayValue": perc_fonc +"%",
                        "tooltext": date.toLocaleDateString() + "{br}" + "{br}Tests: " + nb_test + "{br}Reussis: " + (nb_test - nb_error - nb_fonc) + " (" + perc_test + "%)" + "{br}Erreurs fonc: " + nb_fonc  + " (" + perc_fonc + "%)" + "{br}<strong>Erreurs tech: " + nb_error + " (" + perc_error + "%)" + "</strong>"});
                }
                for (i in $scope.listOfCampagnes) {


                    $scope.myDataSource[i] = {
                        //"nom_camapgne":$scope.listOfCampagnes[i].nom_campagne,
                        "width": "720",
                        "height": "480",
                        "type": $scope.typeGraph,
                        "renderAt": "chartContainer",
                        "chart": {
                            "caption": "Historique des Tests - " + $scope.version +"\n\n(du " + $scope.listOfCampagnes[i].datesForGraph[0].label + " au " + $scope.listOfCampagnes[i].datesForGraph[$scope.listOfCampagnes[i].datesForGraph.length-1].label + ")",
                            "captionFontSize" : 22,
                            "captionFontBold" : false,
                            "subcaptionFontBold" : true,
                            "SubCaptionFontSize" : 22,
                            "subCaption": $scope.listOfCampagnes[i].nom_campagne,
                            "xAxisName": "Date",
                            "yAxisName": "Nombre de Tests",

                            "valueFontSize" : 16,

                            "canvasTopMargin": "100",
                            "decimals": "0",//pas de chiffre apres la virgule
                            "": "",
                            "": "",
                            "plotgradientcolor": "",
                            "formatnumberscale": "0",
                            "showplotborder": "0",
                            "palettecolors": "#5cb85c,#f0ad4e,#d9534f",

                            "bgcolor": "FFFFFF",
                            "showalternatehgridcolor": "1",
                            "divlinecolor": "CCCCCC",
                            "showcanvasborder": "0",
                            "legendborderalpha": "1",
                            "legendshadow": "0",
                            "interactivelegend": "1",
                            "showPercentValues": "0",
                            "showValues": "1",
                            "placevaluesInside": "1",
                            "showsum": "1",
                            "canvasborderalpha": "1",
                            "showborder": "0",

                            "showLabels": 1,
                            //"labelDisplay": "rotate",
                            "rotateLabels": "1",
                            "slantLabels": "1",
                            "useEllipsesWhenOverflow": "1"
                        },
                        "categories": [
                            {
                                "category": $scope.listOfCampagnes[i].datesForGraph
                            }
                        ],
                        "dataset": [
                            {
                                "seriesname": "Tests Reussis",
                                "renderas": "Area",
                                "data": $scope.listOfCampagnes[i].testsOKForGraph

                            },
                            {
                                "seriesname": "Erreurs Fonctionelles",
                                "renderas": "Area",
                                "data": $scope.listOfCampagnes[i].testsKO_F_ForGraph
                            },
                            {
                                "seriesname": "Erreurs Techniques",
                                "renderas": "Area",
                                "data": $scope.listOfCampagnes[i].testsKO_T_ForGraph
                            }
                        ]
                    };

                }
            });
        };
        /**
         * ==============================================================
         */


        /**
         * Fonctions globales
         * ==============================================================
         */

        /**
         * Recuperation du nom d'un groupe à l'aide de son id
         */
        getNomGroupe = function (id) {
            for (var i = 0; i < $scope.groupes.length; i++) {
                if ($scope.groupes[i].id_groupe == id) {
                    return $scope.groupes[i].nom_groupe;
                }
            }
            return "inexistant(voir BD : table Groupe)";
        };

        /**
         * Recuperation du nom de domaine d'un groupe à l'aide de son id
         */
        getDomGroupe = function (id) {
            for (var i = 0; i < $scope.groupes.length; i++) {
                if ($scope.groupes[i].id_groupe == id) {
                    return $scope.groupes[i].nom_domaine;
                }
            }
            return "inexistant(voir BD : table Groupe)";
        };


        $scope.isSuccess = function (tauxreussite) {
            return (tauxreussite >= 90);
        };
        $scope.isWarning = function (tauxreussite) {
            return (tauxreussite < 90 && tauxreussite >= 85);
        };
        $scope.isDanger = function (tauxreussite) {
            return (tauxreussite < 85);
        };

        $scope.getVersionUrl = function (nom_campagne) {
            for (var i in $scope.versions) {
                if ($scope.versions[i].version_SI == $scope.version) {
                    if ($scope.versions[i].nom_campagne == nom_campagne) {
                        return $scope.versions[i].url;
                    }
                }
            }
            return null;
        };

        $scope.animateElem = function (animationName , id) {
            $('#'+id).removeClass('animated slideInRight slideOutRight slideInLeft slideOutLeft');
            var animationEnd = 'webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend';
            $('#'+id).addClass('animated ' + animationName).one(animationEnd, function() {
                $('#'+id).removeClass('animated ' + animationName);
            });
        };
        $scope.animateElem('fadeIn', 'Home');


        /* Fonctions de gestion de l'affichage des sous-groupes
         * Declenchés en cliquant sur un domaine.
         */

        $scope.isShowDomaine = function (domaine, campagne) {
            if ($scope.sh_do == domaine && $scope.sh_camp == campagne) {
                return true;
            }
            return false;
        };


        $scope.sh_do="";
        $scope.sh_camp="";
        $scope.setShowDomaine = function (domaine, campagne) {

            if($scope.isShowDomaine(domaine,campagne)){
                if($scope.sh_do!="" && $scope.sh_camp!="") {
                    $scope.sh_do = "";
                    $scope.sh_camp = "";
                    document.getElementById("tab_princ").className = "col-md-12";
                    document.getElementById("tab_" + campagne).className = "col-md-12";
                }
            }else{
                $scope.animateElem('slideInRight', 'tab_'+domaine+campagne);
                $scope.animateElem('slideInRight', 'tab2_'+domaine+campagne);
                $scope.sh_do =domaine;
                $scope.sh_camp=campagne;
                document.getElementById("tab_princ").className = "col-md-6";
                document.getElementById("tab_"+campagne).className = "col-md-6";
            }



        };

        /*
         * ==============================================================
         */

        /*Fonction de Filtres sur la légende*/

        /**
         * indique quel type est filtré (ex: les erreur fonctionnelles: 'warning')
         * @type {string}
         */
        filtre = "";

        /**
         * change le filtre
         * /!\ on remet le tableau en grand et on cache les groupes pour garder une cohérence si jamais le groupe selectionné disparait a cause du filtre
         * @param newfiltre danger, warning, success or ''.
         */
        $scope.filtrer=function(newfiltre){
            $scope.setShowDomaine($scope.sh_do, $scope.sh_camp);
            if(filtre==newfiltre){
                filtre="";
            }else{
                filtre=newfiltre;
            }
        };

        /**
         * indique si la string en paramètre correspond a un type qui ne doit pas etre caché
         * @param isfilter filtre (warning ...)
         * @returns True si on doit l'afficher
         */
        $scope.filtered=function(isfilter){
            return (filtre==isfilter || filtre=="")
        };

        /**
         * change un pourcentage en filtre (warning, danger ...) selon les trois regles définit plus haut
         * @param entier entre 0 et 100
         * @returns string correspondant au filtre, pas de filtre par défault ('')
         */
        $scope.toFiltre=function(entier){
            if ($scope.isSuccess(entier)){
                return 'success';
            }else{
                if($scope.isDanger(entier)){
                    return 'danger';
                }else{
                    if($scope.isWarning(entier)){
                        return 'warning';
                    }else{
                        return '';
                    }

                }
            }
        };

        /**
         * Fonction créant le donut chart sur les proportions de tests par campagne
         * /!\ doit etre appelé qu'une fois que les données sont entierement calculées
         * appelé a la fin de la fonction getGroupesbyCamp car on sait que les données sont calculées
         */
        constructDonutChart=function() {
            $.getScript('js/lib/Chart.js', function () {
                var data = $scope.dataPie;
                var options = {
                    animation: true,
                    animationEasing: "easeOutExpo",
                    segmentStrokeWidth:0,
                    scaleLineWidth:0
                };

                //Get the context of the canvas element we want to select
                var c = $('#144nuancesDeGrey');
                var ct = c.get(0).getContext('2d');
                var ctx = document.getElementById("144nuancesDeGrey").getContext("2d");
                /**************************************************************************/
                myNewChart = new Chart(ct).Doughnut(data, options);

            })
        };
    }]);

    /**
     * Directive permettant l'affichage de la barre de navigation
     * ==============================================================
     */
    app.directive("navbarperso", function () {
        return {
            templateUrl: "navbar.html",
            controller: ['$scope', '$rootScope', '$http', function ($scope, $rootScope, $http) {
                $scope.versions = [];
                $http.get('/RecipeSLD/rest/versions').success(function (data) {
                    $scope.versions = data;
                    $scope.distinctVersions = [];
                    doublon:
                        for (var i in $scope.versions) {
                            var version = $scope.versions[i].version_SI;
                            for (var j in $scope.distinctVersions) {
                                if (version == $scope.distinctVersions[j]) {
                                    continue doublon;
                                }
                            }
                            $scope.distinctVersions.push(version);
                        }
                });

                //fleche se retournant au clic
                $scope.switchCaretNav = function () {
                    if (document.getElementById("caret_nav").className == 'caret') {
                        document.getElementById("caret_nav").className = 'caret caret-reversed';
                    } else {
                        document.getElementById("caret_nav").className = 'caret';
                    }
                };

                $scope.isSelectedVersion = function (version) {
                    return (version == $rootScope.version);
                }
            }]
        };
    });
    /**
     * ==============================================================
     */

    /**
     * Directive permettant l'affichage du pied de page
     * ==============================================================
     */
    app.directive("footerperso", function () {
        return {
            templateUrl: "footer.html"
        };
    });
    /**
     * ==============================================================
     */
})();