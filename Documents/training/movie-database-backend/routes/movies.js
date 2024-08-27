const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const auth = require('../middleware/auth'); // Assuming you have an auth middleware

// Helper function to run SQL queries
const query = (sql, params) => {
  return new Promise((resolve, reject) => {
    pool.query(sql, params, (error, results) => {
      if (error) reject(error);
      else resolve(results);
    });
  });
};

// GET all movies
router.get('/', async (req, res) => {
  try {
    const movies = await query('SELECT * FROM movies');
    res.json(movies);
  } catch (error) {
    console.error('Error fetching movies:', error);
    res.status(500).json({ message: 'Error fetching movies', error: error.message });
  }
});

// GET a single movie by ID
router.get('/:id', async (req, res) => {
  try {
    const [movie] = await query('SELECT * FROM movies WHERE id = ?', [req.params.id]);
    if (movie) {
      res.json(movie);
    } else {
      res.status(404).json({ message: 'Movie not found' });
    }
  } catch (error) {
    console.error('Error fetching movie:', error);
    res.status(500).json({ message: 'Error fetching movie', error: error.message });
  }
});

// POST a new movie (protected route)
router.post('/', auth, async (req, res) => {
  const {
    title,
    release_year,
    rated,
    released,
    duration,
    genre,
    director,
    writer,
    actors,
    plot,
    language,
    country,
    awards,
    image_url,
    metascore,
    imdb_rating,
    imdb_votes,
    imdb_id,
    type,
    images
  } = req.body;

  // Convert 'released' to proper DATE format if necessary
  const releaseDate = released ? new Date(released).toISOString().split('T')[0] : null;
  // Convert 'images' to JSON string if provided
  const imagesJSON = images ? JSON.stringify(images) : null;

  try {
    const result = await query(
      `INSERT INTO movies (
        title, release_year, rated, released, duration, genre, director, writer, actors, plot,
        language, country, awards, image_url, metascore, imdb_rating, imdb_votes, imdb_id, type, images
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        release_year,
        rated,
        releaseDate,
        duration,
        genre,
        director,
        writer,
        actors,
        plot,
        language,
        country,
        awards,
        image_url,
        metascore || null,
        imdb_rating || null,
        imdb_votes || null,
        imdb_id,
        type,
        imagesJSON
      ]
    );

    res.status(201).json({ message: 'Movie created', id: result.insertId });
  } catch (error) {
    console.error('Error creating movie:', error);
    res.status(500).json({ message: 'Error creating movie', error: error.message });
  }
});


// PUT update a movie (protected route)
router.put('/:id', auth, async (req, res) => {
  const { title, description, release_year, duration, rating, image_url } = req.body;
  try {
    const result = await query(
      'UPDATE movies SET title = ?, description = ?, release_year = ?, duration = ?, rating = ?, image_url = ? WHERE id = ?',
      [title, description, release_year, duration, rating, image_url, req.params.id]
    );
    if (result.affectedRows > 0) {
      res.json({ message: 'Movie updated' });
    } else {
      res.status(404).json({ message: 'Movie not found' });
    }
  } catch (error) {
    console.error('Error updating movie:', error);
    res.status(500).json({ message: 'Error updating movie', error: error.message });
  }
});

// DELETE a movie (protected route)
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await query('DELETE FROM movies WHERE id = ?', [req.params.id]);
    if (result.affectedRows > 0) {
      res.json({ message: 'Movie deleted' });
    } else {
      res.status(404).json({ message: 'Movie not found' });
    }
  } catch (error) {
    console.error('Error deleting movie:', error);
    res.status(500).json({ message: 'Error deleting movie', error: error.message });
  }
});

// GET movies with filtering
router.get('/filter', async (req, res) => {
  const { title, genre, min_rating, max_rating, release_year } = req.query;
  let sql = 'SELECT DISTINCT m.* FROM movies m LEFT JOIN movie_genres mg ON m.id = mg.movie_id LEFT JOIN genres g ON mg.genre_id = g.id WHERE 1=1';
  const params = [];

  if (title) {
    sql += ' AND m.title LIKE ?';
    params.push(`%${title}%`);
  }
  if (genre) {
    sql += ' AND g.name = ?';
    params.push(genre);
  }
  if (min_rating) {
    sql += ' AND m.rating >= ?';
    params.push(parseFloat(min_rating));
  }
  if (max_rating) {
    sql += ' AND m.rating <= ?';
    params.push(parseFloat(max_rating));
  }
  if (release_year) {
    sql += ' AND m.release_year = ?';
    params.push(parseInt(release_year));
  }

  try {
    const movies = await query(sql, params);
    res.json(movies);
  } catch (error) {
    console.error('Error filtering movies:', error);
    res.status(500).json({ message: 'Error filtering movies', error: error.message });
  }
});

// GET movies sorted
router.get('/sort/:field/:order', async (req, res) => {
  const { field, order } = req.params;
  const allowedFields = ['title', 'release_year', 'rating', 'duration'];
  const allowedOrders = ['asc', 'desc'];

  if (!allowedFields.includes(field) || !allowedOrders.includes(order.toLowerCase())) {
    return res.status(400).json({ message: 'Invalid sort parameters' });
  }

  try {
    const movies = await query(`SELECT * FROM movies ORDER BY ${field} ${order}`);
    res.json(movies);
  } catch (error) {
    console.error('Error sorting movies:', error);
    res.status(500).json({ message: 'Error sorting movies', error: error.message });
  }
});

// GET movies with pagination
router.get('/page/:page/:limit', async (req, res) => {
  const { page, limit } = req.params;
  const offset = (page - 1) * limit;

  try {
    const [movies, [{ total }]] = await Promise.all([
      query('SELECT * FROM movies LIMIT ? OFFSET ?', [parseInt(limit), parseInt(offset)]),
      query('SELECT COUNT(*) as total FROM movies')
    ]);

    res.json({
      movies,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalMovies: total
    });
  } catch (error) {
    console.error('Error fetching paginated movies:', error);
    res.status(500).json({ message: 'Error fetching paginated movies', error: error.message });
  }
});

module.exports = router;