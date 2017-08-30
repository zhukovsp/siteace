Websites = new Mongo.Collection("websites");
Comments = new Mongo.Collection("comments");

WebsitesIndex = new EasySearch.Index({
  collection: Websites,
  fields: ['title', 'description'],
  engine: new EasySearch.Minimongo({
  	sort: function () {
      return { vote_up:-1,vote_down:-1,title:1,createdOn:-1 };
    }
  }),
  defaultSearchOptions: {
    limit: 30
  },
});

// index for recommended websites part
WebsitesIndex2 = new EasySearch.Index({
  engine: new EasySearch.MongoTextIndex({
    sort: function () {
      return { vote_up:-1,vote_down:1,title:1,createdOn:-1 };
    }
  }),
  collection: Websites,
  fields: ['title', 'description'],
  defaultSearchOptions: {
    limit: 30
  },
  permission: () => {
    //console.log(Meteor.userId());

    return true;
  }
});


if (Meteor.isClient) {
	/// routing 

	Router.configure({
	  layoutTemplate: 'ApplicationLayout'
	});

	Router.route('/', function () {

		this.render('navbar', {
			to:"navbar"
		});
		this.render('main', {
			to:"main",
			data: function(){
				var query = this.params.query.q
				
					var querystring = decodeURI(query);
					if (!query){
						querystring = "";
						$("#search").val("");
						$(".searchinfo").hide();
					}

					WebsitesIndex
					  .getComponentMethods()
					  .search(querystring);
				
			}
		});
		this.render('recommended', {
			to:"recommended"
		});
	});

	Router.route('/website/:_id', function () {
	  this.render('navbar', {
	    to:"navbar"
	  });
	  $("#search").val("");
	  this.render('website_item_on_page', {
	    to:"main", 
	    data:function(){
	      return Websites.findOne({_id:this.params._id});
	    }
	  });
  	  this.render('comments', {
	    to:"comment"
	  });
	  this.render('recommended', {
	    to:"recommended"
	  });
	});

	/////
	// template helpers 
	/////

	Template.website_list.onRendered(function(){

		// index instanceof EasySearch.index
	  let dict = WebsitesIndex.getComponentDict(/* optional name */);

		// get current search definition - using when page loading with search string in query
		var querysearch=dict.get('searchDefinition');
		//if(querysearch){
	  		console.log(querysearch);
			$("#search").val(querysearch);
		//}
	});

	// helper function that returns all available websites
	Template.website_list.helpers({
		websites:function(){
			//return Websites.find({},{sort:{title:1,createdOn:-1}});
			//return WebsitesIndex;
		},
		getDate:function(date){
			return moment(date).format('MM-DD-YYYY');
		},
		websitesIndex: () => WebsitesIndex,
		searchCount: () => {
		  // index instanceof EasySearch.index
		  let dict = WebsitesIndex.getComponentDict();
		  // get the total count of search results
		  return dict.get('count');
		},
		getText:function(count){
			if (count > 0) {
				return count + " results found"
			}
			else {
				return "No results found!"
			}
		},
	});

	// helper function that returns formated date
	Template.card_grid.helpers({
		getDate:function(date){
			return moment(date).format('MM-DD-YYYY hh:mm');
		}
	});

	// helper function that returns formated date
	Template.comments.helpers({
		getDate:function(date){
			return moment(date).format('MM-DD-YYYY hh:mm');
		},
		getUser:function(user_id){
		  var user = Meteor.users.findOne({_id:user_id});
		    return user.username;
		},
		comments:function(){
			var website_id = Router.current().params._id;
			return Comments.find({"website_id":website_id},{sort:{createdOn:1}});
		}
	});

	Template.navbar.helpers({
		attributes:function(){
			var attr = { placeholder: "Search", class: "form-control js-search-go", id:"search", type:"search" };
			return attr;
		},
		websitesIndex: () => WebsitesIndex
	});

	Template.recommended.helpers({
		recommends:function(){

			var website_id = this._id;
			var wsites = [];
			var words = "";

			/// get all website_id from COMMENTS 
			let cCursor = Comments.find({"userid":Meteor.user()._id});
			cCursor.fetch().forEach(function(doc){
				wsites.push(doc.website_id);
			});

			/// get all website_id from voted_up by userid
			let vCursor = Websites.find({"users_voted_up":Meteor.user()._id});
			vCursor.fetch().forEach(function(doc){
				wsites.push(doc._id);
			});

			/// returns unique website_id
			wsites = wsites.unique();

			/// get all words by unique website_id
			let wCursor = Websites.find({"_id":{$in: wsites}});
			wCursor.fetch().forEach(function(doc){
				words = words + " " + doc.title;
			});
			words = sTrim(words);
			if (words.length == 0){
				words = undefined;
			}
			/// searching websites by words within title and description
			let cursor = WebsitesIndex2.search(words),
			docs = cursor.fetch();

		  	return docs;
		},
		searchCount: () => {
		  // index instanceof EasySearch.index
		  let dict = WebsitesIndex2.getComponentDict();
		  // get the total count of search results
		  return dict.get('count');
		}
	});



	/////
	// template events 
	/////

	Template.card_grid.rendered = function (){
		$(document).ready(function(){
			$(".tooltipped").tooltip({delay: 10});
			$(".dropdown-button").dropdown();
		});	
	}
	Template.navbar.rendered = function (){
		$(document).ready(function(e){
		/*	$(document).mouseup(function (e)
			{
			    var container = $(".login");
			    var container2 = $("#login_button");

			    if (
			    	(!container.is(e.target) && container.has(e.target).length === 0)
			    	&&
			    	(!container2.is(e.target) && container2.has(e.target).length === 0)

			    ) // ... nor a descendant of the container
			    {
			        container.hide();
			    }
			});*/
			// the "href" attribute of .modal-trigger must specify the modal ID that wants to be triggered
	   		$('.modal-trigger').leanModal();
		});	

	}

	Template.card_grid.events({
		"click .js-upvote":function(event){
			// example of how you can access the id for the website in the database
			// (this is the data context for the template)
			var website_id = this._id;
			if (this.__originalId){
				website_id = String(this.__originalId);
			}

			//remove user from users_voted_down
			var isVotedUp = Websites.findOne({_id:website_id, users_voted_up:Meteor.user()._id});
			var isVotedDown = Websites.findOne({_id:website_id, users_voted_down:Meteor.user()._id});

			if(!isVotedUp && !isVotedDown)
			{
				Websites.update(
				    { _id: website_id },
				    {
				    	$pull: { users_voted_down: Meteor.user()._id } ,
					 	$addToSet: { users_voted_up: Meteor.user()._id },
					 	$inc: {vote_up:1}
				 	},
				 	{ multi: true }
				);
			}
			else
			{
				if(isVotedDown){
					Websites.update(
					    { _id: website_id },
					    {
					    	$pull: { users_voted_down: Meteor.user()._id } ,
						 	$addToSet: { users_voted_up: Meteor.user()._id },
						 	$inc: {vote_down:1,vote_up:1}
					 	},
					 	{ multi: true }
					);
				}
			}
			return false;// prevent the button from reloading the page
		}, 
		"click .js-downvote":function(event){

			var website_id = this._id;
			if (this.__originalId){
				website_id = String(this.__originalId);
			}

			//$pull - delete item
			//$addToSet - add item if doesn't exist
			var isVotedUp = Websites.findOne({_id:website_id, users_voted_up:Meteor.user()._id});
			var isVotedDown = Websites.findOne({_id:website_id, users_voted_down:Meteor.user()._id});
			if(!isVotedUp && !isVotedDown)
			{
				Websites.update(
				    { _id: website_id },
				    {
				    	$pull: { users_voted_up: Meteor.user()._id } ,
					 	$addToSet: { users_voted_down: Meteor.user()._id },
					 	$inc: {vote_down:-1}
				 	},
				 	{ multi: true }
				);
			}
			else
			{
				if(isVotedUp){
					Websites.update(
					    { _id: website_id },
					    {
					    	$pull: { users_voted_up: Meteor.user()._id } ,
						 	$addToSet: { users_voted_down: Meteor.user()._id },
						 	$inc: {vote_down:-1,vote_up:-1}
					 	},
					 	{ multi: true }
					);
					console.log("Your vote was changed");
				}
			}

			return false;// prevent the button from reloading the page
		}
	});

	Template.website_form.events({
		"submit .js-save-website-form":function(event){

			// here is an example of how to get the url out of the form:
			var url = event.target.url.value;
			var title = event.target.title.value;
			var description = sTrim(event.target.description.value);
			
			if ( !url || !description){
				if(!url){ $(event.target.url).addClass("invalid");}
				if(!description) {$(event.target.description).addClass("invalid");}
				$("#validnote").addClass("novalid");
			}
			else{
				///  website saving code in here!
				if (Meteor.user()){
					Websites.insert({
						title:title, 
			    		url:url, 
			    		description:description, 
			    		createdOn:new Date(),
			    		vote_up:0,
			    		vote_down:0
					});
				}

				$("#website_form").toggle('slow');
			}

			return false; /// stop the form submit from reloading the page

		},
		"keypress input":function(event) {
    		$(event.target).removeClass('novalid');
    	},
    	"keyup .js-http-on":function(event){
    		/// get url from input
			var url = $(event.target).val();

			/// if url is valid
			if (isUrlValid(url)){

				var fullurl = "http://www.bing.com/search?q="+url;

				/// call server function gets html code from bing by url
				/// parsing html of page
				Meteor.call('getContentByUrl', fullurl, function(error, results) {
    				var parsed = $("<div/>").append(results.content);
	    			var title = parsed.find(".b_algo:first h2 a").text();
	    			var description = parsed.find(".b_algo:first .b_caption p:first").text();

    				/// filling out title, description fields
		    		$("#title").val(title);
		    		$("#description").val(description);
	    		});

			}
			else{
				$(event.target).addClass("invalid");
				$("#validnote").addClass("novalid");
			};
    	}
	});

	Template.comments.events({
		"submit .js-add-comment":function(event){

			/// get website_id from query
			var website_id = Router.current().params._id;
			/// get comment message
			var msg = event.target.message.value;
			/// add comment to database
			if (Meteor.user()){
				Comments.insert({
					message:msg, 
		    		website_id:website_id, 
		    		userid:Meteor.user()._id, 
		    		createdOn:new Date()
				});
			}

			/// clear message field
	  		event.target.message.value = "";

			return false;
		}
	});

	Template.navbar.events({
		"click .js-search-clear":function(event){
			Router.go('/');
				$(".searchinfo").hide();
				event.target.value = 0;
		},
		"click .js-toggle-website-form":function(event){
			$("#website_form").toggle('slow');
		},
		"keyup .js-search-go":function(event){
			Router.go('/?q='+encodeURI(event.target.value));
			if (!event.target.value)
			{
				$(".searchinfo").hide();
			}

			if (event.target.value.length == 0 )
			{
				Router.go('/');
				$(".searchinfo").hide();
			}
			else
			{
		        /// imitate delay and results loading gif
				$(".loading").remove();
		        $("#list_result").hide();
		        $("#result_wrapper").prepend("<div class='loading progress purple lighten-4'><div class='indeterminate purple'></div></div>");
				setTimeout(function(){	          
		        	$(".searchinfo").show();
			  		$(".loading").remove();
					$("#list_result").show();
				}, 400);		    
				/// -
			}
		},
		"click .js-login":function(event){
			event.preventDefault();
			if (!Meteor.user()){
				$("#register_card").hide();
				$("#login_card").show();
			}
			else{
				$("#account_card").show();
			}

			//$("#login-dialog").toggle();
			return false;
		},
		"click .js-close-spec":function(event){
			$('#modal2').closeModal();
			return false;
		}

	});

	/// accounts config
	//Accounts.ui.config({
	//	passwordSignupFields: "USERNAME_AND_EMAIL"
	//});

	/// Regular expression tests if url is valid
	function isUrlValid(url) {
    	return /^(https?|s?ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i.test(url);
	}

	function sTrim(x) {
	    return x.replace(/^\s+|\s+$/gm,'');
	}

	/// returns array of unique elements
	Array.prototype.contains = function(v) {
	    for(var i = 0; i < this.length; i++) {
	        if(this[i] === v) return true;
	    }
	    return false;
	};

	Array.prototype.unique = function() {
	    var arr = [];
	    for(var i = 0; i < this.length; i++) {
	        if(!arr.contains(this[i])) {
	            arr.push(this[i]);
	        }
	    }
	    return arr; 
	}
	/// --

}


if (Meteor.isServer) {
	// start up function that creates entries in the Websites databases.
  Meteor.startup(function () {
    // code to run on server at startup
    if (!Websites.findOne()){
    	console.log("No websites yet. Creating starter data.");
    	  Websites.insert({
    		title:"Goldsmiths Computing Department", 
    		url:"http://www.gold.ac.uk/computing/", 
    		description:"This is where this course was developed.", 
    		createdOn:new Date(),
    		vote_up:0,
    		vote_down:0
    	});
    	 Websites.insert({
    		title:"University of London", 
    		url:"http://www.londoninternational.ac.uk/courses/undergraduate/goldsmiths/bsc-creative-computing-bsc-diploma-work-entry-route", 
    		description:"University of London International Programme.", 
    		createdOn:new Date(),
    		vote_up:0,
    		vote_down:0
    	});
    	 Websites.insert({
    		title:"Coursera", 
    		url:"http://www.coursera.org", 
    		description:"Universal access to the world’s best education.", 
    		createdOn:new Date(),
    		vote_up:0,
    		vote_down:0
    	});
    	Websites.insert({
    		title:"Google", 
    		url:"http://www.google.com", 
    		description:"Popular search engine.", 
    		createdOn:new Date(),
    		vote_up:0,
    		vote_down:0
    	});
    }

  });

	
	var googleurl = 'http://www.bing.com/search?q=https%3a%2f%2fwww.arduino.cc';
	
	Meteor.methods({
        getContentByUrl: function (url) {
            this.unblock();
            //console.log(url);
            return Meteor.http.call("GET", url);
        }
    });
}
