module.exports = function Route(app, querystring){
	var users = [];
	var rooms = [];
	
	function get_timestamp(){
		var date = new Date();
		return date.getTime();
	}
	
	function get_room(room_id, callback){
		var specific_room = null;
		for(index in rooms)
		{
			if(rooms[index].room_id == room_id)
			{
				specific_room = rooms[index];
				break;
			}
		}
		
		if(callback && typeof(callback) == 'function')
			callback(specific_room);
		else
			return specific_room;
	}
	
	function member_index_exists(member_value, members_array){
		var index_found = null;
		
		for(index in members_array)
		{	
			if(members_array[index] == member_value)
			{
				index_found = index;
				break;
			}
		}
		
		return index_found;
	}
	
	//POST
	app.post('/process', function(req, res){
		req.session.name = req.body.name;
		req.session.sessionID = req.sessionID;
		req.session.room_id = 0;
		req.session.save(function(){
			users.push({
				session_id : req.session.sessionID,
				name : req.session.name,
				room_id : null
			});
			
			res.redirect('lobby');
		});
		
	});
	// separate room page
	app.post('/make_room', function(req, res) {
		var room_data = req.body;
		
		room = {
			room_id : get_timestamp(),
			room_name : room_data.room_name,
			max_players : (room_data.max_players <= 4 && room_data.max_players % 2 == 0) ? room_data.max_players : 2,
			members : [],
			member_sprites : [],
			member_count : 0,
			scrolls : [],
			teams : [],
			default_message : (room_data.max_players <= 4 && room_data.max_players % 2 == 0) ? '' : 'Maximum number of players has been reset to two (2)',
		}
		
		rooms.push(room);
		
		app.io.broadcast('render_rooms', rooms);
		res.redirect('/room/'+ room.room_id);
	});
	
	app.get('/room/*', function(req, res) {
		if(req.session.sessionID != undefined && typeof(req.session.name) != 'undefined')
		{
			var room = get_room(req.params[0]);
			
			if(room != null)
			{
				if(room.member_count != room.max_players || member_index_exists(req.session.sessionID, room.members) != null)
				{
					var starting_health = 100;
					var x_coord = 0;
					var y_coord = 0;
					var direction = 1;
					var team = 1;
					
					if(member_index_exists(req.session.sessionID, room.members) == null)
					{
						room.members.push(req.session.sessionID);
						
						if((room.member_count + 1) % 2 == 0){
							team = 2;
							x_coord = 41;
						}
						room.member_count += 1;
					}
					else
					{
						var member_index = member_index_exists(req.session.sessionID, room.members);
						
						if(room.member_sprites[member_index] != null)
						{
							starting_health = room.member_sprites[member_index].health;
							x_coord = room.member_sprites[member_index].x;
							y_coord = room.member_sprites[member_index].y;
							direction = room.member_sprites[member_index].direction;
							team = room.member_sprites[member_index].team;
						}
					}
					
					res.render('room', { 
						room_id : req.params[0],
						title : room.room_name,
						user_id : req.session.sessionID,
						user_name : req.session.name,
						starting_health : starting_health,
						direction : direction,
						max_players : room.max_players,
						default_message : room.default_message,
						team : team,
						x_coord : x_coord,
						y_coord : y_coord
					});
				}
				else
					res.render('full');
			}
			else
				res.redirect('/lobby');
		}
		else
			res.redirect('/lobby');
	});
	
	app.io.route('new_user', function(req){
		req.io.join(req.data);
		get_room(req.data, function(room){
			if(room != null)
			{
				req.session.room_id = room.room_id;
				req.session.save();
				app.io.room(req.data).broadcast('render_users', { players : room.member_sprites, player_count : room.member_count });
				app.io.broadcast('render_rooms', rooms);
			}
		});
	});
	
	app.io.route('announce_game_winner', function(req){
		app.io.room(req.data.room_id).broadcast('announce_winner', 'Team '+ req.data.team +' wins!');
	});
	
	app.io.route('reset_players', function(req){
		get_room(req.data.room_id, function(room){
			if(room != null)
			{
				room.member_sprites = req.data.sprites;
				
				for(var index in rooms)
				{
					if(rooms[index].room_id == req.data.room_id)
						rooms[index] = room;
				}
				
				app.io.room(req.data.room_id).broadcast('render_users',  { players : room.member_sprites, player_count : room.member_count });
			}
		});
	});
	
	app.io.route('update_users', function(req){
		get_room(req.data.room_id, function(room){
			if(room != null)
			{
				var has_match = false;
				
				if(room.member_sprites && typeof(room.member_sprites) == 'undefined')
					room.member_sprites = [];
					
				for(var members_index in room.member_sprites)
				{
					if(room.member_sprites[members_index] != null){
						if(room.member_sprites[members_index].name == req.data.name){
							room.member_sprites[members_index] = req.data;
							has_match = true;
							break;
						}
					}
				}
				
				if(has_match == false)
					room.member_sprites.push(req.data);
						
				app.io.room(req.data.room_id).broadcast('render_users',  { players : room.member_sprites, player_count : room.member_count });
			}
		});
	});
	
	app.io.route('update_scrolls', function(req){
		var room = get_room(req.data.room_id);
		var has_match = false;
		
		for(var scroll_index in room.scrolls)
		{
			if(room.scrolls[scroll_index].name == req.data.name){
				room.scrolls[scroll_index] = req.data;
				has_match = true;
				break;
			}
		}
		
		if(has_match == false)
			room.scrolls.push(req.data);
			
		app.io.room(req.data.room_id).broadcast('render_scrolls', room.scrolls);
	});
	
	app.io.route('remove_scroll', function(req){
		var room = get_room(req.data.room_id);
		
		if(room != null){
			for(var scroll_index in room.scrolls)
			{
				if(room.scrolls[scroll_index].name == req.data.name)
				{
					room.scrolls.splice(scroll_index, 1);
					break;
				}
			}
				
			app.io.room(req.data.room_id).broadcast('remove_scrolls', req.data);
		}
	});
	
	app.io.route('leave_room', function(req, res){
		req.io.leave(req.data);
		req.session.room_id = null;
		req.session.save();
		
		var room = get_room(req.data);
		if(room != null)
		{
			for(index in room.members)
			{
				if(room.members[index] == req.session.sessionID)
				{
					room.members.splice(index, 1);
					room.member_sprites.splice(index, 1);
					room.member_count -= 1;
					break;
				}
			}
				
			for(index in rooms)
			{
				if(room.room_id == rooms[index].room_id )
				{
					if(room.member_count == 0){
						rooms.splice(index, 1);
						app.io.broadcast('render_rooms', rooms);
					}
					else{
						rooms[index] = room;
						app.io.room(req.data).broadcast('announce', {
							message : req.session.name +' has left the room'
						});
						
						app.io.room(req.data).broadcast('render_users', room.member_sprites);
					}
					
					break;
				}
			}
		}
		
		req.io.emit('exit_to_lobby');
	});
		
	app.io.route('show_lobby', function(){
		app.io.broadcast('render_rooms', rooms);
	});
		
	app.get('/lobby', function(req, res) {
		if(req.session.name == undefined)
			res.redirect('/');
		else
		{
			res.render('lobby');
		}
	});
	
	app.get('/', function(req, res) {
		if(req.session.sessionID == undefined)
			res.render('login');
		else
		{
			res.redirect('lobby');
		}
	});
	
	app.io.route('show_lobby', function(){
		app.io.broadcast('render_rooms', rooms);
	});
	
	app.io.route('disconnect', function(req){
		//console.log('\n\n\n\n\n Previous Room ID:\n\n', req.session.room_id);
		req.io.emit('leave_room_on_disconnect', req.session.room_id);
	});
}