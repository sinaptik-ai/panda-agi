"""
Dashboard Compiler Package

A comprehensive system for compiling XML dashboard specifications into interactive HTML dashboards.
"""

__version__ = "1.0.0"
__author__ = "Dashboard Compiler"

from .xml_parser import XMLParser
from .csv_processor import CSVProcessor
from .formula_evaluator import FormulaEvaluator
from .html_generator import HTMLGenerator
from .dashboard_compiler import DashboardCompiler

__all__ = [
    "XMLParser",
    "CSVProcessor",
    "FormulaEvaluator",
    "HTMLGenerator",
    "DashboardCompiler",
]
