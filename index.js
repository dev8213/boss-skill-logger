String.prototype.clr = function(hexColor) {return `<font color="#${hexColor}">${this}</font>`};

const SettingsUI = require('tera-mod-ui').Settings
const default_hook = {filter: {fake: false}}
const baselist = require('./lib/abnormalities')
const path = require('path')
const fs = require('fs')
const logfolder = path.join(__dirname, 'bosslogs')

if (!fs.existsSync(logfolder)) fs.mkdirSync(logfolder)

module.exports = function Bosslogger(mod) {
	
	const { entity, player } = mod.require.library;

    let createlog = false,
		servants = new Set(),
		entities = new Map(),
		zone,
        bossid,
		bosshp

    var stream;

	// commands
    mod.command.add('logboss', () => {
        if (ui) {
            ui.show()
        } else {
            mod.settings.logboss = !mod.settings.logboss
            mod.command.message(`Boss skill logger is now ${mod.settings.logboss ? "enabled" : "disabled"}.`)
        }
    });
	mod.command.add('dungeonmessage', () => {
        if (ui) {
            ui.show()
        } else {
            mod.settings.dungeonmessage = !mod.settings.dungeonmessage
            mod.command.message(`Message logger is now ${mod.settings.dungeonmessage ? "enabled" : "disabled"}.`)
        }
    });
	mod.command.add('logabnormal', () => {
        if (ui) {
            ui.show()
        } else {
            mod.settings.logabnormal = !mod.settings.logabnormal
            mod.command.message(`Abnormality logger is now ${mod.settings.logabnormal ? "enabled" : "disabled"}.`)
        }
    })
	mod.command.add('writelog', () => {
        if (ui) {
            ui.show();
        } else {
            mod.settings.writelog = !mod.settings.writelog;
            mod.command.message(`Log writing is now ${mod.settings.writelog ? "enabled" : "disabled"}.`);
        }
    })
	mod.command.add('createlog', () => {
        createlog = !createlog;
        togglemode();
        if (mod.settings.writelog && (mod.settings.logboss || mod.settings.logabnormal || mod.settings.dungeonmessage)) {
            mod.command.message(`Logfile has been generated into the modules sub folder.`);
        }
        if (!mod.settings.logboss && !mod.settings.logabnormal && !mod.settings.dungeonmessage) {
            mod.command.message(`Logfile cannot be created you need to activate some logging stuff first.`);
        }
        if (!mod.settings.writelog) {
            mod.command.message(`Logfile cannot be created you need to activate writelog function first.`);
        }
    })
	function togglemode() {
        if (mod.settings.writelog) {
            if (mod.settings.logboss || mod.settings.logabnormal || mod.settings.dungeonmessage) {
                let filename = path.join(logfolder, zone+'_'+Date.now()+'.js');
                stream = fs.createWriteStream(filename, {
                    flags: 'a'
                });
            } else {
                if (stream) {
                    try {
                        stream.end();
                    } catch (e) {
                        mod.log(e);
                    }
                }
            }
        }
    }

    
	// hooks
    mod.game.on('enter_game', () => {
        togglemode();
    })
	mod.game.on('leave_game', () => {
        if (stream) {
            try {
                stream.end();
            } catch (e) {
                mod.log(e);
            }
        }
    })
	mod.hook('S_REQUEST_SPAWN_SERVANT', 4, (event) => {
		servants.add(event.gameId)
		if (event.replaceId != 0n) servants.delete(event.replaceId)
	})
	
	mod.hook('S_REQUEST_DESPAWN_SERVANT', 1, (event)=> { 
		servants.delete(event.gameId);
	})
	mod.hook('S_LOAD_TOPO', 3, (event) => {
        zone = event.zone
	})
	mod.hook('S_BOSS_GAGE_INFO', 3, (event) => {
		if (zone == 9711) return
        bosshp = Math.floor((Number(event.curHp) / Number(event.maxHp)) * 10000) / 100
        bossid = event.id
    });
	mod.hook('S_SHOW_HP', 3, (event) => {
		if (zone != 9711) return
		if (event.maxHp < 9999999999) return
        bosshp = Math.floor((Number(event.curHp) / Number(event.maxHp)) * 10000) / 100
        bossid = event.gameId
    })
	mod.hook('S_NPC_STATUS', 2, (event) => {
		if (!mod.settings.logboss) return
        const entity = getEntity(event.gameId)
        if(event.enraged) {
            if(!entity.get('enraged'))
                if (mod.settings.writelog && stream) {
					stream.write(gettime()+' |S_NPC_STATUS| >> '+'source: '+getId(event.gameId)+' enrage: true'+' duration: '+round(event.remainingEnrageTime,1000)+'s\n')
				}
			entity.set('enraged', true)
        } else {
            if(entity.get('enraged'))
                if (mod.settings.writelog && stream) {
					stream.write(gettime()+' |S_NPC_STATUS| >> '+'source: '+getId(event.gameId)+' enrage: false'+'\n')
				}
            entity.set('enraged', false)
        }
    })
	mod.hook('S_CREATURE_LIFE', 3, (event) => {
		if (!mod.settings.logboss) return
		let name = null
		if (player.isMe(event.gameId)) name = player.name
		else if (player.playersInParty.has(event.gameId)) name = entity.players[event.gameId.toString()].name
		else return
		if (mod.settings.writelog && stream) {
			stream.write(gettime()+' |S_CREATURE_LIFE| >> '+'name: '+name+' status: '+event.alive?'resurrected':'dead'+'\n')
		}
    })
	mod.hook('S_DUNGEON_EVENT_MESSAGE', 2, (event) => {
		if (!mod.settings.dungeonmessage) return;
		event.message = event.message.replace(/[\u000B]/g, " ")
        if (!mod.settings.writelog) {
			sendchat('Message: '+`${event.message}`.clr('ff00e8')+'.')
        }
        if (mod.settings.writelog && stream) {
            stream.write(gettime()+' |S_DUNGEON_EVENT_MESSAGE| >> '+'message: '+event.message+' source: '+event.source+'.'+'\n')
        }
    })
	mod.hook('S_QUEST_BALLOON', 1, (event) => {
		if (!mod.settings.questballoon || servants.has(event.source)) return
		event.message = event.message.replace(/[\u000B]/g, " ")
		if (!mod.settings.writelog) {
			sendchat('Balloon: '+`${event.message}`.clr('ff00e8')+'.')
        }
        if (mod.settings.writelog && stream) {
            stream.write(gettime()+' |S_QUEST_BALLOON| >> '+'message: '+event.message+' source: '+event.source+'.'+'\n')
        }
    })
	mod.hook('S_ABNORMALITY_BEGIN', 5, (event) => {
		if (!mod.settings.logabnormal || baselist[event.id] || mod.settings.blacklist.includes(event.id)) return
        if (!mod.settings.writelog) {
			if (event.target === bossid || mod.game.me.is(event.target)) {
				sendchat('Abnormality: '+`${event.id}`.clr('00e8ff')+' Stacks: '+`${event.stacks}`.clr('00ffc5'))
			}
		}
        if (mod.settings.writelog && stream) {
            if (event.target === bossid || event.source === bossid || event.source === 0n || (!mod.game.me.is(event.source) && mod.game.me.is(event.target))) {
			     stream.write(gettime()+' |S_ABNORMALITY_BEGIN| >> '+'id: '+event.id+' Duration: '+round(event.duration,1000)+'s stacks: '+event.stacks+' source: '+getId(event.source)+' target: '+getId(event.target)+'\n')
            }
        }
    })
	mod.hook('S_ABNORMALITY_REFRESH', 2, (event) => {
		if (!mod.settings.logabnormal || baselist[event.id] || mod.settings.blacklist.includes(event.id)) return
		if (!mod.settings.writelog) {
			if (event.target === bossid || mod.game.me.is(event.target)) {
				sendchat('Abnormality: '+`${event.id}`.clr('00e8ff')+' Stacks: '+`${event.stacks}`.clr('00ffc5'))
			}
		}
        if (mod.settings.writelog && stream) {
            if (event.target === bossid || mod.game.me.is(event.target)) {
			     stream.write(gettime()+' |S_ABNORMALITY_REFRESH| >> '+'id: '+event.id+' duration: '+round(event.duration,1000)+'s stacks: '+event.stacks+' target: '+getId(event.target)+'\n')
            }
        }
    })
	mod.hook('S_CREATURE_ROTATE', 2, (event) => {
		if (!mod.settings.logabnormal) return
        if (mod.settings.writelog && stream) {
            if (event.gameId === bossid) {
			     stream.write(gettime()+' |S_CREATURE_ROTATE| >> '+'source: '+getId(event.gameId)+' time: '+event.time+'\n')
            }
        }
    })
	mod.hook('S_ACTION_STAGE', 9, (event) => {
        if (!mod.settings.logboss || !mod.settings.whitelist.includes(event.templateId)) return
        if (event.stage == 0) sendchat('Action Stage: '+`${event.skill}`.clr('ffe800')+' Skill ID: '+`${event.skill.id}`.clr('ff8000')+' HP: '+`${bosshp}`.clr('17ff00')+'%'+'.')
        if (mod.settings.writelog && stream) {
            if (mod.settings.whitelist.includes(event.templateId)) {
                stream.write(gettime()+' |S_ACTION_STAGE| >> '+'source: '+getId(event.gameId)+' skill: '+event.skill.id+' stage: '+event.stage+' hp: '+bosshp+' loc: '+loc(event.loc)+' dest: '+loc(event.dest)+' w: '+round(event.w,1)+' anim: '+anim(event.animSeq)+'\n')
            }
        }
    })
	mod.hook('S_ACTION_END', 5, (event) => {
        if (!mod.settings.logboss || !mod.settings.whitelist.includes(event.templateId)) return
        if (mod.settings.writelog && stream) {
            if (mod.settings.whitelist.includes(event.templateId)) {
                stream.write(gettime()+' |S_ACTION_END| >> '+'source: '+getId(event.gameId)+' skill: '+event.skill.id+' loc: '+loc(event.loc)+' w: '+round(event.w,1)+ ' type: '+event.type+'\n')
            }
        }
    })
	mod.hook('S_SPAWN_NPC', 12, (event) => {
        if (!mod.settings.logboss) return
        if (mod.settings.writelog && mod.settings.logboss) {
            if (mod.settings.whitelist.includes(event.templateId)) {
                stream.write(gettime()+' |S_SPAWN_NPC| >> '+'source: '+getId(event.gameId)+' villager: '+event.villager+' visible: '+event.visible+' loc: '+loc(event.loc)+'\n')
            }
        }
    })
	mod.hook('S_DESPAWN_NPC', 3, (event) => {
        if (!mod.settings.logboss) return
        if (mod.settings.writelog && mod.settings.logboss) {
            if (mod.settings.whitelist.includes(event.templateId)) {
                stream.write(gettime()+' |S_DESPAWN_NPC| >> '+'source: '+getId(event.gameId)+' type: '+event.type+' loc: '+loc(event.loc)+'\n')
            }
        }
    })

	// functions
    function gettime() {
        var time = new Date()
        var timeStr = addZero(time.getHours(),2)+':'+addZero(time.getMinutes(),2)+':'+addZero(time.getSeconds(),2)+':'+addZero(time.getMilliseconds(),3)
        return timeStr
    }
	function addZero(x,n) {
	  while (x.toString().length < n) {
		x = '0'+x
	  }
	  return x
	}
	function sendchat(msg) {
        mod.command.message(
            msg
        );
    }
	function round(num,dvd) {
		return Math.round((Number(num)/dvd) * 100) / 100
    }
	function anim(num) {
		if (num.length === 0) return 0
		let temp = 0
		num.forEach(arr =>
			temp += arr.distance
		)
		return Math.round(temp)
    }
	function loc(data) {
		data.x = Math.round(data.x)
		data.y = Math.round(data.y)
		data.z = Math.round(data.z)
		return	data
	}
	function getEntity(id){
        if(!id) return false
        id = id.toString()
        if(!entities.has(id)) entities.set(id, new Map())
        return entities.get(id)
    }
	function getId(obj) {
		if (entity.mobs[obj.toString()]) return Number(`${entity.mobs[obj.toString()].huntingZoneId}${entity.mobs[obj.toString()].templateId}`)
		if (entity.mobs[obj.toString()]) return Number(`${entity.mobs[obj.toString()].huntingZoneId}${entity.mobs[obj.toString()].templateId}`)
		else if (entity.npcs[obj.toString()]) return Number(`${entity.npcs[obj.toString()].huntingZoneId}${entity.npcs[obj.toString()].templateId}`)
		else if (entity.players[obj.toString()]) return entity.players[obj.toString()].name
		else if (mod.game.me.is(obj)) return player.name
		else return obj
	}
	let ui = null
    if (global.TeraProxy.GUIMode) {
        ui = new SettingsUI(mod, require('./settings_structure'), mod.settings, {height: 350}, {alwaysOnTop: true});
        ui.on('update', settings => {mod.settings = settings;});

        this.destructor = () => {
            if (ui) {
                ui.close()
                ui = null
            }
        };
    }
};
