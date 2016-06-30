/**
 * Dependances
 * $scope: Acces aux variables JS depuis le HTML
 * $cookies: Gestion des cookies pour maintenir ma connexion
 * $window: Redirections
 */
var app = angular.module("tilesApp", []);
app.controller("TilesCtrl", ['$scope', function ($scope) {
    $scope.tiles=[
        [{"name": "Name","class": "col-sm-4","color":"menu-item red", "link":"#", "icon": "glyphicon glyphicon-time"},{"name": "Name","class": "col-sm-4","color":"menu-item green", "link":"#", "icon": "glyphicon glyphicon-time"},{"name": "Name","class": "col-sm-4","color":"menu-item red", "link":"#", "icon": "glyphicon glyphicon-time"}],
        [{"name": "Name","class": "col-sm-4","color":"menu-item light-red", "link":"#", "icon": "glyphicon glyphicon-time"},{"name": "Name","class": "col-sm-4","color":"menu-item blue", "link":"#", "icon": "glyphicon glyphicon-time"},{"name": "Name","class": "col-sm-4","color":"menu-item red", "link":"#", "icon": "glyphicon glyphicon-time"}],
        [{"name": "Name","class": "col-sm-4","color":"menu-item light-orange", "link":"#", "icon": "glyphicon glyphicon-time"},{"name": "Name","class": "col-sm-4","color":"menu-item purple", "link":"#", "icon": "glyphicon glyphicon-time"},{"name": "Name","class": "col-sm-4","color":"menu-item red", "link":"#", "icon": "glyphicon glyphicon-time"}]
    ];

    modified=false;
    $scope.modif=function(){
        modified = !modified;
    };
    $scope.isInModif=function(){
        return modified;
    };

    $scope.remove=function(tile, ligne){
        var index = $scope.tiles.indexOf(ligne);
        if (index > -1) {
            var index2 = ligne.indexOf(tile);
            if (index2 > -1) {
                ligne.splice(index2, 1);
            }
        }
    }
    
    $scope.resize=function(tuile){
        if(tuile.class=="col-sm-4"){
            tuile.class="col-sm-8";
        }else{
            if(tuile.class=="col-sm-2"){
                tuile.class="col-sm-4";
            }else{
                tuile.class="col-sm-2"
            }
        }
    };

    $scope.changeName=function(tuile){
        tuile.name = prompt("Saisissez le nouveau nom:");
    };

    $scope.changeLink=function(tuile){
        tuile.link = prompt("Saisissez le nouveau lien (n'oubliez de commencer par http://):", tuile.link);
    };



}]);
