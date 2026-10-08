import unittest

from zentangles.grid import paradox_grid
from zentangles.tangles.paradox import paradox


class ParadoxTest(unittest.TestCase):
    def test_first_polygon_is_the_cell(self):
        polygons = paradox(0, 0, 10, steps=1)
        self.assertEqual(polygons[0], [(0, 0), (10, 0), (10, 10), (0, 10)])

    def test_each_vertex_lands_ratio_along_next_side(self):
        inner = paradox(0, 0, 10, steps=1, ratio=0.2)[1]
        self.assertEqual(inner[0], (2.0, 0.0))
        self.assertEqual(inner[1], (10.0, 2.0))

    def test_counter_clockwise_spins_the_other_way(self):
        inner = paradox(0, 0, 10, steps=1, ratio=0.2, clockwise=False)[1]
        self.assertEqual(inner[0], (0.0, 2.0))

    def test_rejects_invalid_ratio(self):
        with self.assertRaises(ValueError):
            paradox(0, 0, 10, ratio=1.5)

    def test_grid_has_n_squared_cells(self):
        polygons = paradox_grid(3, 300, steps=5)
        self.assertEqual(len(polygons), 9 * 6)


if __name__ == "__main__":
    unittest.main()
