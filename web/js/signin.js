/*
 * Application angular JS permettant d'identifier un administrateur présent dans la base
 * Utilisée sur la page signin.html
 *
 */

/*
 * Dependances
 * $scope: Acces aux variables JS depuis le HTML
 * $http: Gestion des appels REST
 * $cookies: Gestion des cookies pour maintenir ma connexion
 * $window: Redirections
 */
var app = angular.module("signinApp", ['ngCookies']);
    app.controller("signInCtrl", ['$scope', '$http', '$cookies', '$window', function($scope, $http, $cookies, $window) {


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
        //URL de l'application REST RecipeSLD

        /*
         * Fonction permetant d'identifier l'utilisateur
         * Verifie l'association login/mdp en base à l'aide d'un appel REST
         * Puis créé le cookie permettant de maintenir la connexion
         */
        $scope.test = true;
        $scope.signin = function(){
            //Appel REST pour récuperer les infos admin (login - password)
            $http.get('/RecipeSLD/rest/admins/' + $scope.login).success(function (data) {
                //on compare les version hashés du mdp rentré par l'utilisateur et de celui en base.
                if ($scope.password == decode(data.mdp_user, sha256($scope.password))) {
                    $scope.test = true;
                    //creation des cookies
                    $cookies.put("usr",$scope.login);
                    $cookies.put("tkn", sha256($scope.password));
                    //redirection vers la page admin
                    $window.location.href = '/RecipeWeb/admin.html';
                }else{
                    $scope.test = false;
                }
            })
        };

        /*
         * Fonction permetant de tester si l'utilisateur est encore identifié
         * Verifie la présence et la coherence des cookies
         * Effectue un appel REST pour recuperer les informations en base
         */
        $scope.isLoged = function() {
            //Appel REST pour récuperer les infos admin (login - password)
            $http.get('/RecipeSLD/rest/admins/' + $cookies.get("usr")).success(function (data) {
                //verification de la coherence entre le cookie et le mot de passe en base
                if ($cookies.get("tkn") == sha256(decode(data.mdp_user, $cookies.get("tkn")))) {
                    return true;
                }else{
                    //sinon redirection vers la page de login
                    $window.location.href = '/RecipeWeb/signin.html';
                    return false;
                }
            })
            $window.location.href = '/RecipeWeb/signin.html';
            return false;
        }
    }]);

    /*
     * Directive permettant l'affichage du pied de page
     * ==============================================================
     */
    app.directive("footerperso", function () {
        return {
            templateUrl: "footer.html"
        };
    });
    /*
     * ==============================================================
     */