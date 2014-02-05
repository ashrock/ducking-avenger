var square_size = 25;
var max_cols = 10;
var max_rows = 42;
var stage = null;
var users_array = [];
var box_array = [];
var remaining_players = 2;
var team = [];

var grid = [
	[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
	[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
	[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
	[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
	[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
	[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
	[2,2,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,2,2],
	[2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,2,2,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2],
	[2,2,2,2,1,0,0,0,0,0,0,0,0,0,0,0,0,1,2,2,2,2,2,2,1,0,0,0,0,0,0,0,0,0,0,0,0,1,2,2,2,2],
	[2,2,2,2,2,1,0,0,0,0,0,0,0,0,0,0,1,2,2,2,2,2,2,2,2,1,0,0,0,0,0,0,0,0,0,0,1,2,2,2,2,2],
	[2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2]
]

function draw_grid(){
	stage = document.getElementById('stage');
	
	for(var y_index in grid)
	{
		for(var x_index in grid[y_index])
		{
			var add_tile_class = '';
			
			switch(grid[y_index][x_index])
			{
				case 0:
					add_tile_class = 'air';
					break;
				case 1:
					add_tile_class = 'floor_1';
					break;
				case 2:
					add_tile_class = 'floor_2';
					break;
			}
			stage.innerHTML += '<div class="tile '+ add_tile_class +'" style="width:'+ square_size +'px;height:'+ square_size +'px;top:'+ (y_index*square_size) +'px;left:'+ (x_index*square_size) +'px;"></div>';
		}
	}
}

function Man(config){
	this.config = {
		name : config.name,
		user_id : config.user_id,
		room_id : config.room_id,
		team : config.team,
		health : config.health,
		starting_x : (config.team == 1) ? 0 : (max_rows - 1) ,
		x : config.x,
		y : config.y,
		direction : config.direction,
		max_health : 100,
		shape : [ [1],
				  [1] ]
	}
	
	var players_layer = document.getElementById('players');
	
	var self = this;
	
	this.initialize = function(){
		io.emit('update_users', self.config);
		self.update();
	}
	
	this.check_ground = function(){
		var ground_coord = grid.length - 1;
		for(var y_coord in grid)
		{
			if(grid[y_coord][self.config.x] > 0)
			{
				ground_coord = y_coord - 1; // offset for the player's body
				break;
			}
		}
		
		return ground_coord;
	};
	
	this.check_walls = function(direction){
		var colliding_tiles = [];
		
		for(var shape_y in self.config.shape)
		{
			if(grid[(parseInt(self.config.y) + parseInt(shape_y))][self.config.x + direction] > 0)
			{
				colliding_tiles.push(grid[shape_y][self.config.x + direction]);
				break;
			}
		}
		
		return (colliding_tiles.length == 0 && self.config.x + direction >= 0 && self.config.x + direction < max_rows) ? false : true;
	}
	
	this.die = function(){
		self.config.y = 0;
		self.config.x = self.config.starting_x;
		alert("You've been taken out!");
	}
	
	this.update = function(){
		if(self.config.y < parseInt(self.check_ground()) - 1)
			self.config.y += 1;
		
		io.emit('update_users', self.config);
	}
	
	this.keydown = function(e){
		if((e.which == 65 || e.keyCode == 65))
		{
			self.config.direction = -1;
			
			if(self.check_walls(self.config.direction) == false)
				self.config.x -= 1;
		}
			
		if((e.which == 68 || e.keyCode == 68))
		{
			self.config.direction = 1;
			
			if(self.check_walls(self.config.direction) == false)
				self.config.x += 1;
		}
		
		
		self.update();
	}
	
	this.keyup = function(e){
		if(e.which == 13 || e.keyCode == 13)
		{
			var scroll = new Scroll({
				x: self.config.x,
				y: self.config.y,
				direction: self.config.direction,
				team : self.config.team,
				user_id : self.config.user_id,
				room_id : self.config.room_id
			});
		}
		
		if(e.which == 32 || e.keyCode == 32)
		{
			self.config.y -= 1;
			
			if(self.check_walls(self.config.direction) == false)
				self.config.x += self.config.direction;
		}
		
		self.update();
	}
	
	this.initialize();
}

function get_timestamp(){
	var date = new Date();
	return date.getTime();
}

function Scroll(config){
	this.config = {
		name : 'scroll_'+ get_timestamp(),
		x : config.x,
		y: config.y,
		direction: config.direction,
		shape : [0],
		degree : 0,
		team : config.team,
		user_id : config.user_id,
		room_id : parseInt(config.room_id)
	}
	var self = this;
	var scrolls_layer = document.getElementById('scrolls');
	
	this.initialize = function(){
		var scroll_element = document.createElement('div');
		scroll_element.setAttribute('id', self.config.name);
		scrolls_layer.appendChild(scroll_element);
		self.update();
	}
	
	this.check_walls = function(direction){
		var colliding_tiles = [];
		var colliding_players = [];
		
		// check collision with the stage boundaries or ground
		for(var shape_y in self.config.shape)
		{
			if(grid[ (parseInt(self.config.y) + parseInt(shape_y)) ][ self.config.x + direction ] > 0)
			{
				colliding_tiles.push(grid[shape_y][self.config.x + direction]);
				break;
			}
		}
		
		// check collision to players
		for(var user_index in users_array)
		{
			if((self.config.x + direction) == users_array[user_index].x && self.config.y == users_array[user_index].y 
			|| (self.config.x + direction) == users_array[user_index].x && self.config.y == users_array[user_index].y + 1) 
			{
				if(self.config.user_id != users_array[user_index].user_id && self.config.team != users_array[user_index].team && users_array[user_index].health > 0){
					colliding_players.push(users_array[user_index]);
					break;				
				}
			}
		}
		
		if(colliding_players.length > 0)
		{
			users_array[user_index].health -= 5;
			io.emit('update_users', users_array[user_index]);
			
			if(users_array[user_index].health <= 0){
				
				var team_member_count = 0;
				
				for(var team_member_index in team[users_array[user_index].team - 1]){
					if(team[users_array[user_index].team - 1][team_member_index] != users_array[user_index].user_id){
						team_member_count++;
					}
				}
				
				if(team_member_count == 0)
					io.emit('announce_game_winner', { room_id : self.config.room_id, team: self.config.team });
			}
		}
		
		return (colliding_tiles.length == 0 && colliding_players.length == 0 && self.config.x + direction >= 0 && self.config.x + direction <= max_rows - 1 ) ? false : true;
	}
	
	this.update = function(){
		if(self.check_walls(self.config.direction) == false)
		{
			self.config.x += self.config.direction;
			self.config.degree += 30;
			
			io.emit('update_scrolls', self.config)
			setTimeout(self.update, 20)
		}
		else
		{
			io.emit('remove_scroll', self.config);
			var scroll_element = document.getElementById(self.config.name);
			
			if(scroll_element != null)
				scrolls_layer.removeChild(scroll_element);
			self = null;
		}
	}
	
	this.initialize();
}