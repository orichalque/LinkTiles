/*
 * Application angular JS permettant d'administrer l'application
 * Utilisée sur la page admin.html
 * La recuperation des données ainsi que l'ajout et la supression s'effectue par appels REST sur l'application SLD360
 */
(function () {

    /**
     * Dependances
     * $scope: Acces aux variables JS depuis le HTML
     * $http: Gestion des appels REST
     * $cookies: Gestion des cookies pour maintenir ma connexion
     * $window: Redirections
     */
    var app = angular.module("adminApp", ['smart-table',"ngCookies"]);
    app.controller("groupeCtrl", ['$scope', '$http', '$cookies', '$window','$q',  function ($scope, $http, $cookies, $window, $q) {

        encode = function(string)
        {
            return (CryptoJS.AES.encrypt(string, sha256(string)).toString());
        };

        decode = function(string, key)
        {
            var decrypted = CryptoJS.AES.decrypt(string, key);
            decrypted = decrypted.toString(CryptoJS.enc.Utf8);
            return decrypted
        };

        sendHttpRequest = function(uri, parameters, pMethod) {
            var defer = $q.defer();
            $http({
                method: pMethod,
                url: uri,
                data: parameters
            }).then(function successCallback(response) {
                defer.resolve(response.data);
            }, function errorCallback(response) {
                defer.reject(response.data);
            });
            return defer.promise;
        };
        //valeurs par défauts
        /**
         * Liste des Domaines en base
         * Par défault (avant chargement) contient juste la string "Loading..."
         * @type Array of Json de Domaine
         */
        $scope.domaines = [{nom_domaine: "Loading..."}];
        $scope.domaineCH = {};

        /**
         * Indique si le message d'ajout doit s'afficher
         * @type {boolean}
         */
        $scope.entityAdded = false;
        /**
         * indique si le message d'erreur doit s'afficher
         * @type {boolean}
         */
        $scope.error = false;
        /**
         * Liste des Groupes en base
         * Par défault (avant chargement) contient juste la string "Loading..."
         * @type Array of Json de Groupe
         */
        $scope.groupes = [{nom_groupe: "Loading..."}];


        //recuperation cookies
        /**
         * permet de tester si l'utilisateur est encore identifié
         * Verifie la présence et la coherence des cookies
         * Effectue un appel REST pour recuperer les informations en base
         * ==============================================================
         */
        var tkn = $cookies.get('tkn');
        var usr = $cookies.get('usr');
        //permet de cacher le html si l'utilisateur n'est pas identifié
        $scope.isloged = true;
        //Appel REST pour récuperer les infos de l'utilisateur correspondant au cookie usr
        sendHttpRequest('/RecipeSLD/rest/admins/' + usr,{},'GET').then(function (data) {
            // comparaison des mot de passes
            if (tkn != null){
                $scope.isloged = (tkn == sha256(decode(data.mdp_user, tkn)));
            }else {
                $scope.isloged = false;
            }
            if ($scope.isloged == null || $scope.isloged == false) {
                $window.location.href = '/RecipeWeb/signin.html';
            }

            //Appel REST pour récuperer les infos admin (login)
            sendHttpRequest('/RecipeSLD/rest/admins/',{},'GET').then(function (data) {
                // pour la partie permetant de gerer les admins
                $scope.users = data;
            });
        });
        /*
         * ==============================================================
         */


        //--------------Utilitaires pour les modifications des données---------------
        $scope.tomodif="";
        $scope.modifier=function(nom){
            $scope.tomodif = nom;
        };
        $scope.modif=function(nom){
            return nom==$scope.tomodif;

        };
        /*
         * ==============================================================
         */

        /*
         * Onglet administration des groupes
         * ==============================================================
         */

        /*
         * Recuperation des groupes par appel REST
         * Appels l'application SLD 360
         */

        getGroupes = function () {
            sendHttpRequest('/RecipeSLD/rest/groupes', {}, 'GET').then(function(data) {
                $scope.groupes = data;
            });
        };
        getGroupes();

        /***
         * Ajout du groupe rentré par l'utilisateur dans les champs
         * Appels un service REST permettant l'ajout
         * Appel effectué sur l'application SLD360
         */
        $scope.addGroupe = function () {
            $scope.error = false;
            $scope.message = '';
            //creation du Json en fonction du formulaire html
            $scope.jsonGroupe = {
                nom_groupe: $scope.nom_groupeCH,
                nom_domaine: $scope.domaineCH.nom_domaine,
                nom_campagne: $scope.nom_campagneCH,
                description_groupe: $scope.descr_groupeCH
            };
            //on verifie la présence du groupe dans la BD
            for (i in $scope.groupes) {
                var grp = $scope.groupes[i];
                if (grp.nom_groupe == $scope.nom_groupeCH && grp.nom_domaine == $scope.domaineCH.nom_domaine && grp.nom_campagne == $scope.nom_campagneCH) {
                    $scope.message = "deja dans la BD";
                    $scope.error = true;
                    return;
                }
            }
            //appel REST pour ajouter le groupe
            sendHttpRequest('/RecipeSLD/rest/groupes', $scope.jsonGroupe, 'POST').then(function() {
                $scope.message = "Groupe Ajouté avec succès";
                $scope.entityAdded = true;
                //ajout dynamique du groupe pour l'affichage (pas besoin d'actualiser)
                sendHttpRequest('/RecipeSLD/rest/groupes', null, 'GET').then(function(data){
                    $scope.groupes=data;
                });
            }, function errorCallback(){
                $scope.error = true;
                $scope.message = "failure : n'existe-t-il pas déja dans la base ?";
            });

        };

        //pour enlever la bulle "d'ajout avec succes"
        $scope.setFalse = function () {
            $scope.entityAdded = false;
            $scope.error=false;
        };

        /**
         * suppression d'un groupe
         * Appels un service REST permettant la suppression
         * Appel effectué sur l'application SLD360
         * @param groupe le JSON du groupe a supprimer
         */
        $scope.removeGroupe = function (groupe) {
            //Fenetre modale
            if (confirm('Voulez-vous vraiment supprimer ce groupe? Ceci supprimera aussi ses résultats')) {
                //appel REST de suppression en fonction de l'id du groupe
                sendHttpRequest('/RecipeSLD/rest/groupes/' + groupe.id_groupe,{},'DELETE').then(function () {
                    //on supprime aussi le groupe de l'affichage (pas besoin d'actualiser)
                    var index = $scope.groupes.indexOf(groupe);
                    if (index > -1) {
                        $scope.groupes.splice(index, 1);
                    }
                });
            }
        };

        /**
         * modification de la campagne et/ou de la description d'un groupe et/ou de son nom
         * @param groupe le groupe modifié
         */
        $scope.change_groupe=function(groupe){
            sendHttpRequest("/RecipeSLD/rest/groupes/update", groupe,'POST').then(function () {
                $scope.tomodif="";
            });
        };
        /*
         * ==============================================================
         */


        /*
         * Onglet administration des domaines
         * ==============================================================
         */

        //récuperations des domaines
        getDomaines = function () {
            sendHttpRequest('/RecipeSLD/rest/domaines',{},'GET').then(function (data) {
                $scope.domaines = data;
                $scope.domaineCH = $scope.domaines[0];
            });
        };
        getDomaines();

        /**
         * Ajout du domaine rentré par l'utilisateur dans les champs
         * Appels un service REST permettant l'ajout
         * Appel effectué sur l'application SLD360
         */
        $scope.addDomaine = function () {
            $scope.message = '';
            // creation du Json a envoyer
            // en fonction des champs du formulaire
            $scope.jsonDomaine = {
                nom_domaine: $scope.nom_domaineCH,
                description_domaine: $scope.descr_domaineCH
            };
            //appel REST pour envoyer le domaine
            var req = sendHttpRequest('/RecipeSLD/rest/domaines', $scope.jsonDomaine,'POST');
            req.then(function () {
                $scope.message = "Domaine Ajouté avec succès";
                $scope.entityAdded = true;
                //ajout dynamique du domaine pour l'affichage (pas besoin d'actualiser)
                $scope.domaines.push($scope.jsonDomaine);
            }, function errorCallback(){
                $scope.error = true;
                $scope.message = "failure : n'existe-t-il pas déja dans la base ?";
            });

        };

        /**
         * suppression d'un domaine
         * Appels un service REST permettant la suppression
         * Appel effectué sur l'application SLD360
         */
        $scope.removeDomaine = function (domaine) {
            //fenetre modale
            if (confirm('Voulez-vous vraiment supprimer ce domaine? Ceci supprimera aussi les groupes concernés et leurs résultats')) {
                //appel REST de suppression du domaine
                sendHttpRequest('/RecipeSLD/rest/domaines/' + domaine.nom_domaine,{},'DELETE').then(function () {
                    //supression dynamique pour l'affichage (pas besoin d'actualiser)
                    var index = $scope.domaines.indexOf(domaine);
                    if (index > -1) {
                        $scope.domaines.splice(index, 1);
                    }
                });
            }
        };

        $scope.change_desc_dom=function(domaine){
            sendHttpRequest('/RecipeSLD/rest/domaines/update/description_domaine', domaine,'POST').then(function () {
                $scope.tomodif="";
            });
        };

        /*
         * ==============================================================
         */




        /*
         * Onglet administration des versions
         * ==============================================================
         */

        /**
         * Ajout de la version rentrée par l'utilisateur dans les champs
         * Appels un service REST permettant l'ajout
         * Appel effectué sur l'application SLD360
         */
        $scope.addVersion = function () {
            $scope.message = '';
            // creation du Json à envoyer
            // en fonction des champs du formulaire
            $scope.jsonVersion = {
                version_SI: $scope.nom_versionCH,
                url: $scope.URL_versionCH,
                nom_campagne: $scope.nom_campagneVersionCH
            };
            //appel REST d'ajout de la version
            sendHttpRequest('/RecipeSLD/rest/versions', $scope.jsonVersion,'POST').then(function () {
                $scope.message = "Version Ajoutée avec succès";
                $scope.entityAdded = true;
                //MAJ de l'afichage
                $scope.versions.push($scope.jsonVersion);
            }, function errorCallback(){
                $scope.error = true;
                $scope.message = "failure : n'existe-t-elle pas déja dans la base ?";
            });

        };

        /**
         * suppression d'une version
         * Appels un service REST permettant la suppression
         * Appel effectué sur l'application SLD360
         */
        $scope.removeVersion = function (version) {
            //fenetre modale
            if (confirm('Voulez-vous vraiment supprimer cette version? (pas d\'influence sur les résultats)')) {
                //appel REST de supression de la version en fonction de son nom et de sa campagne
                sendHttpRequest('/RecipeSLD/rest/versions/' + version.version_SI + '/campagne/' + version.nom_campagne,{},'DELETE').then(function () {
                    var index = $scope.versions.indexOf(version);
                    if (index > -1) {
                        //MAJ de l'affichage
                        $scope.versions.splice(index, 1);
                    }
                });
            }
        };

        /**
         * modification de l'url d'une version
         * @param v la version contenant l'url modifiée
         */
        $scope.change_url_version=function(v){
            sendHttpRequest("/RecipeSLD/rest/versions/update/url", v,'POST').then(function () {
                $scope.tomodif="";
            });
        };
        /*
         * ==============================================================
         */


        /*
         * Onglet administration des admin
         * ==============================================================
         */

        /**
         * Ajout d'un administrateur rentré par l'utilisateur dans les champs
         * Appels un service REST permettant l'ajout
         * Appel effectué sur l'application SLD360
         */
        $scope.user = {username: "", password: "", confirmation: ""};
        $scope.register = function () {
            $scope.message = '';
            //creation du Json à envoyer
            $scope.jsonUser = {
                nom_user: $scope.user.username,
                mdp_user: encode($scope.user.password)
            };
            //appel REST pour creer l'administrateur en base
            sendHttpRequest('/RecipeSLD/rest/admins', $scope.jsonUser,'POST').then(function () {
                $scope.message = "Utilisateur Ajouté avec succès";
                $scope.entityAdded = true;
                //MAJ de l'affichage
                $scope.users.push($scope.jsonUser);
            }, function errorCallback(){
                $scope.error = true;
                $scope.message = "failure : n'existe-t-il pas déja dans la base ?";
            });
        };

        /**
         * Verifie l'égalité des deux mdp rentrés dans le champ du formulaire
         */
        $scope.mdpEquals = function () {
            return $scope.user.password == $scope.user.confirmation;
        };

        /**
         * suppression d'un admin
         * Appels un service REST permettant la suppression
         * Appel effectué sur l'application SLD360
         */
        $scope.removeAdmin = function (user) {
            //fenetre modale
            if (confirm('Voulez-vous vraiment supprimer cet utilisateur ?')) {
                //appel REST de suppression de l'admin à l'aide de son nom
                sendHttpRequest('/RecipeSLD/rest/admins/' + user.nom_user,{},'DELETE').then(function () {
                    var index = $scope.users.indexOf(user);
                    if (index > -1) {
                        //MAJ affichage
                        $scope.users.splice(index, 1);
                    }
                });
            }
        };
        /*
         * ==============================================================
         */

        /*
         * Onglet administration des resultats
         * ==============================================================
         */

        //récuperations des resultats (de campagne)
        getresultats = function () {
            sendHttpRequest('/RecipeSLD/rest/resultatscampagnes',{},'GET').then(function (data) {
                $scope.resultats = data;
                for(var res of $scope.resultats){
                    var date = new Date(res.date_exec)
                    res.dateString=date.toLocaleString();
                }
            });
        };
        getresultats();


        /**
         * suppression d'un resultats
         * Appels un service REST permettant la suppression
         * Appel effectué sur l'application SLD360
         */
        $scope.removeResultat = function (res) {
            //fenetre modale
            if (confirm('Voulez-vous vraiment supprimer les résultats de cette date ci? Ceci supprimera aussi les résultats de groupes et de domaines concernés ')) {
                //appel REST de suppression du res
                delete res.dateString;
                //+res.nom_campagne + "/"+ res.date_exec + "/"+res.version_SI
                $http({
                    method: 'DELETE',
                    url: '/RecipeSLD/rest/resultatscampagnes',
                    data: res,
                    headers: {
                        'Content-Type': "application/json"
                    }
                }).then(function() {
                    var index = $scope.resultats.indexOf(res);
                    if (index > -1) {
                        $scope.resultats.splice(index, 1);
                    }
                    removeResGroupes(res.nom_campagne, res.date_exec, res.version_SI);
                });
            }
        };

        removeResGroupes=function(nom,date,version){
            $http({
                method: 'DELETE',
                url: '/RecipeSLD/rest/resultatsgroupes/nom_campagne/'+nom+'/date_exec/'+date+'/version_SI/'+version,
                data: {},
            }).then(function() {
                console.log("ok");
            });
        };


        /*
         * ==============================================================
         */


        /**
         * Gestion des tabs
         * Permet de savoir quel tab afficher
         * ==============================================================
         */
        this.tab = 1;
        $scope.error = false;

        this.setTab = function (newValue) {
            this.tab = newValue;
        };

        this.isSet = function (tabName) {
            return this.tab === tabName;
        };
        /*
         * ==============================================================
         */

    }]);

    /**
     * Directive permettant l'affichage de la barre de navigation
     * ==============================================================
     */
    app.directive("navbarperso", function () {
        return {
            templateUrl: "navbar.html",
            controller: ['$scope', '$http', function ($scope, $http) {
                $scope.versions = [{version_SI: ""}];
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
            }]
        };
    });
    /*
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
     * Directive permettant la detection de l'appuie sur la touche Entrée
     * Utile pour les modifications dans la zone admin
     * ==============================================================
     */
    app.directive('ngEnter', function() {
        return function(scope, element, attrs) {
            element.bind("keydown keypress", function(event) {
                if(event.which === 13) {
                    scope.$apply(function(){
                        scope.$eval(attrs.ngEnter, {'event': event});
                    });

                    event.preventDefault();
                }
            });
        };
    });
    /*
     * ==============================================================
     */


})();
