"""
graph.py — LangGraph StateGraph definition (for visualization/testing)
======================================================================
The SSE endpoint orchestrates nodes manually for real streaming.
This compiled graph is kept for ``draw_mermaid()`` and unit tests.
"""

from langgraph.graph import END, StateGraph

from .nodes import (
    entry_node,
    retriever_vector_node,
    router_node,
)
from .state import GraphState


def _route_after_router(state: dict) -> str:
    """Conditional edge: pick the next node based on router intent."""
    intent = state["router_output"].intent
    return {
        "RAG_SEARCH": "retriever_vector_node",
        "DEEP_STUDY": "synthesis_node",      # stub — goes straight to synthesis
        "CONVERSATIONAL": "synthesis_node",
        "OUT_OF_SCOPE": "synthesis_node",
    }.get(intent, "synthesis_node")


def build_graph() -> StateGraph:
    """
    Assemble the 4-node LangGraph StateGraph.

    Flow::

        START → entry → router → [conditional]
            → retriever_vector → synthesis → END
            → synthesis → END  (conversational / out-of-scope)
    """
    g = StateGraph(GraphState)

    # Nodes (synthesis is a regular function here, not the streaming generator)
    g.add_node("entry_node", entry_node)
    g.add_node("router_node", router_node)
    g.add_node("retriever_vector_node", retriever_vector_node)
    # synthesis_node is intentionally omitted from the compiled graph
    # because the SSE endpoint drives it differently (streaming generator)

    # Edges
    g.set_entry_point("entry_node")
    g.add_edge("entry_node", "router_node")
    g.add_conditional_edges(
        "router_node",
        _route_after_router,
        {
            "retriever_vector_node": "retriever_vector_node",
            "synthesis_node": END,
        },
    )
    g.add_edge("retriever_vector_node", END)

    return g


compiled_graph = build_graph().compile()


def print_graph_mermaid() -> None:
    """Print Mermaid diagram for documentation / debugging."""
    print("\n=== CampusMind AI — Graph ===\n")
    print(compiled_graph.get_graph().draw_mermaid())
    print(f"\n=== Nodes: {len(compiled_graph.get_graph().nodes)} ===\n")
