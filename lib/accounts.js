if (Meteor.isClient) {

  if (Accounts._resetPasswordToken) {
    Session.set('resetPassword', Accounts._resetPasswordToken);
  }
  //////////dynamic Templates

  /// if we have reactivar var with template name, we can change it
  Template.navbar.onCreated( function() {
    this.currentState = new ReactiveVar( "account_signin" );
    if (Meteor.userId()){
      this.currentState.set("account_signout");
    }
  });
  ///- and respectively change template from any helpers 
  Template.navbar.helpers({
    account_state: function(event,template) {
      return Template.instance().currentState.get();
    }
  });
  Template.account_forgot_setpassword.helpers({
    resetPassword : function(event) {
      return Session.get('resetPassword');
    }
  });
  Template.account_forgot_setpassword.events({
    'submit .account-forgot-setpassword': function( event, template ){
      $("#login-ok").remove();
      $("#login-error").remove();
      event.preventDefault();
      var passwordVar = event.target.newPassword.value;
      if (passwordVar) {
        Accounts.resetPassword(Session.get('resetPassword'), passwordVar, function(err){
          if (err){
            $(".account-forgot-setpassword .card-action .input-field").after("<p id='login-error'>"+err.reason+"</p>");
          }
          else {
            $(".account-forgot-setpassword .card-action .input-field").after("<p id='login-ok'>Password updated</p>");
            setTimeout(function(){
              Session.set('resetPassword', null);
            },800);
          }
        });
      }
      return false; 
    },
    'click .js-close-setpswd':function(){
      $("#modal1").hide();
      Session.set('resetPassword', null);
    }
  });
  Template.navbar.events({
    'click .js-account-signin': function( event, template ) {
      template.currentState.set("account_signin");
    },
    'click .js-account-frgtpswd': function( event, template ) {
      template.currentState.set("account_forgot_password");
    },
    'click .js-account-rgstr': function( event, template ) {
      template.currentState.set("account_register");
    },
    'click .js-account-cngpswd': function( event, template ) {
      template.currentState.set("account_change_password");
    },
    'click .js-account-signout': function( event, template ) {
      event.preventDefault();
      Meteor.logout();
      ///is it necessery? Is Template.login_dialog.onCreated must do the same?
      template.currentState.set("account_signin");
    },
    'submit .account-signin': function( event,template ){
      $("#login-error").remove();
      event.preventDefault();
      var useremailVar = event.target.loginUserEmail.value;
      var passwordVar = event.target.loginPassword.value;

      Meteor.loginWithPassword(useremailVar, passwordVar, function(err){
        if (err) {
          $(".account-signin .card-content").append("<p id='login-error'>"+err.reason+"</p>");
        } else {
            //console.log('login success');
          $("#login-dialog").hide();
          $("#login-error").remove();
          
          console.log("user logged in");
        }
      });
    },
    'submit .account-register': function( event,template ){
      $("#login-error").remove();
      event.preventDefault();
      var userVar = event.target.registerUsername.value;
      var emailVar = event.target.registerEmail.value;
      var passwordVar = event.target.registerPassword.value;
      var reason = "";
      if (emailVar.length<5){
        userVar = "";
        reason = "Need to set a email";
      }
      if (userVar.length == 0 && reason.length == 0){
        emailVar = "";
        reason = "Need to set a username";
      }

      Accounts.createUser({username: userVar, email: emailVar, password: passwordVar }, function(err){
        if (err) {
          if (reason.length == 0) {
            reason = err.reason;
          }
        $(".account-register .card-content").append("<p id='login-error'>"+reason+"</p>");         
        } else {
        // Success. Account has been created and the user
        // has logged in successfully. 
        $("#login-dialog").hide();
        $("#login-error").remove();

        console.log("user registered");
        }
      });
    },
    'submit .account-forgot-password': function( event,template ){
      $("#login-error").remove();
      if (!Meteor.user()){
        event.preventDefault();
        var emailVar = event.target.registeredEmail.value;

        Accounts.forgotPassword({email: emailVar}, function(err){
          if (err) {
            $(".account-forgot-password .btn").before("<p id='login-error'>"+err.reason+"</p>");
          } else {
            $(".account-forgot-setpassword .card-action .input-field").after("<p id='login-ok'>Email sent</p>");
            setTimeout(function(){
              $("#login-dialog").hide();
              template.currentState.set("account_signout");
            },800);
          }
        });
      }
    },
    'submit .account_change_password': function( event,template ){
      $("#login-error").remove();
      if (Meteor.user()){
        event.preventDefault();
        var oldPassVar = event.target.oldPassword.value;
        var newPassVar = event.target.newPassword.value;

        Accounts.changePassword(oldPassVar, newPassVar, function(err){
          if (err) {
            $(".account_change_password .card-action .row").after("<p id='login-error'>"+err.reason+"</p>");
          } else {
            template.currentState.set("account_changed_password");
            setTimeout(function(){
              $("#login-dialog").hide();
              template.currentState.set("account_signin");
            },800);

          }
        });
      }
    },
    "click .js-login":function( event,template ){
      if (Meteor.user()){
        template.currentState.set ( "account_signout" );
      }
      $("#login-dialog").toggle();
      return false;
    }
  });
  //////////--

  Template.navbar.rendered = function (){
    $(document).ready(function(){
      $(".dropdown-button").dropdown();
    }); 
  }
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
