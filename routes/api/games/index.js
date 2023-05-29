const express = require('express');

const db = require('../../../db');
const { generateGameCode, getActiveMultiplayerGames, insertGame, checkIfGameCodeExists, getBestScoresForCategory } = require('./games_utils')
const { getCurrentPlayersInGame } = require('../../../socket_utils');

const router = express.Router();


router.get('/multiplayer/active', async (req, res) => {
    /*
    res.json({
        message: 'Active multiplayer games',
        games: await getActiveMultiplayerGames()
    })
    */
   // New way : add current player count in games list
    let games = await getActiveMultiplayerGames();
    games = await Promise.all(games.map(async (game) => {
        game.current_players_count = (await getCurrentPlayersInGame(game.id)).length;
        return game;
    }));
    res.json({
        message: 'Active multiplayer games',
        games
    })
});

router.post('/multiplayer', async (req, res) => {

    if(!req.body.category){
        return res.status(400).json({
            message: 'Merci de renseigner une catégorie'
        })
    }

    // category should be an integer
    if(isNaN(req.body.category)){
        return res.status(400).json({
            message: 'Merci de renseigner une catégorie valide'
        })
    }

    let creator_id = req.user.id;
    let category_id = req.body.category;

    let game_code = generateGameCode();
    while(await checkIfGameCodeExists(game_code)){
        game_code = generateGameCode();
    }

    await insertGame(creator_id, category_id, game_code);
    
    res.json({
        message: 'Game created',
        category: category_id,
        game_code: game_code
    })
});

router.get('/leaderboard/:category/streak', async (req, res) => {

    if(!req.params.category){
        return res.status(400).json({
            message: 'Merci de renseigner une catégorie'
        })
    }

    res.json({
        message: 'Best scores for category',
        scores: await getBestScoresForCategory(req.params.category)
    })
});


module.exports = router;